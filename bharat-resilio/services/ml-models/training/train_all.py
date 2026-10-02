"""
Train all six from-scratch Bharat Resilio models and emit weights/.

Models (in dependency order):
  1. bedwum        : 1D-CNN acoustic classifier         -> weights/bedwum.pt
  2. hazard        : multi-task severity + tier MLP      -> weights/hazard.pt
  3. edge_vision   : single-stage grid detector          -> weights/edge_vision.pt
  4. gnn_router    : spatio-temporal edge weight GNN     -> weights/gnn_router.pt
  5. dex_llm       : char-level seq2seq text -> JSON     -> weights/dex_llm.pt
  6. preparedness  : small seq2seq guidance generator    -> weights/preparedness.pt

Every model is trained from random initialization on synthetic data generated
this session. Run:  python3 services/ml-models/training/train_all.py
Optional:        --quick            fewer epochs/samples for fast smoke runs
"""

import argparse
import json
import os
import sys
import time

import numpy as np
import torch
import torch.nn as nn

HERE = os.path.dirname(os.path.abspath(__file__))
SERVICE_DIR = os.path.dirname(HERE)
MODELS_DIR = os.path.join(SERVICE_DIR, "models")
WEIGHTS_DIR = os.path.join(SERVICE_DIR, "weights")

sys.path.insert(0, SERVICE_DIR)

from models import bedwum, hazard, edge_vision, gnn_router, dex_llm, preparedness  # noqa: E402

DEVICE = "cpu"


def log(msg: str) -> None:
    print(f"[train] {msg}", flush=True)


def train_bedwum(quick: bool) -> dict:
    n_pos = 800 if quick else 1500
    n_neg = 800 if quick else 1500
    model = bedwum.BedwumCNN()
    log(f"bedwum: generating {n_pos}+{n_neg} waveforms...")
    X, y = bedwum.make_bedwum_dataset(n_pos=n_pos, n_neg=n_neg)
    Xt = torch.from_numpy(X)
    yt = torch.from_numpy(y).float()
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.BCEWithLogitsLoss()
    epochs = 3 if quick else 8
    batch = 64
    n = Xt.size(0)
    for epoch in range(epochs):
        model.train()
        perm = torch.randperm(n)
        total, correct = 0.0, 0.0
        for i in range(0, n, batch):
            idx = perm[i:i + batch]
            logits = model(Xt[idx])
            loss = loss_fn(logits.squeeze(-1), yt[idx])
            opt.zero_grad()
            loss.backward()
            opt.step()
            total += loss.item() * idx.numel()
            pred = (torch.sigmoid(logits).squeeze(-1) > 0.5).float()
            correct += (pred == yt[idx]).sum().item()
        acc = correct / n
        log(f"bedwum epoch {epoch + 1}/{epochs} loss={total / n:.4f} acc={acc:.3f}")
    path = os.path.join(WEIGHTS_DIR, "bedwum.pt")
    torch.save({"state_dict": model.state_dict(), "name": "bedwum"}, path)
    return {"model": "bedwum", "accuracy": acc, "path": path}


def train_hazard(quick: bool) -> dict:
    n = 2000 if quick else 4000
    model = hazard.MultiTaskHazard()
    X, sev, tier = hazard.make_hazard_dataset(n=n)
    Xt = torch.from_numpy(X)
    sev_t = torch.from_numpy(sev)
    tier_t = torch.from_numpy(tier)
    opt = torch.optim.Adam(model.parameters(), lr=2e-3)
    epochs = 12 if quick else 30
    batch = 128
    n_samples = Xt.size(0)
    for epoch in range(epochs):
        model.train()
        perm = torch.randperm(n_samples)
        total_loss, correct, tot = 0.0, 0, 0
        for i in range(0, n_samples, batch):
            idx = perm[i:i + batch]
            s, tl = model(Xt[idx])
            loss = hazard.multi_task_loss(s, sev_t[idx], tl, tier_t[idx])
            opt.zero_grad()
            loss.backward()
            opt.step()
            total_loss += loss.item() * idx.numel()
            correct += (tl.argmax(1) == tier_t[idx]).sum().item()
            tot += idx.numel()
        acc = correct / tot
        log(f"hazard epoch {epoch + 1}/{epochs} loss={total_loss / tot:.4f} tier_acc={acc:.3f}")
    path = os.path.join(WEIGHTS_DIR, "hazard.pt")
    torch.save({"state_dict": model.state_dict(), "name": "hazard"}, path)
    return {"model": "hazard", "tier_accuracy": acc, "path": path}


def train_edge_vision(quick: bool) -> dict:
    n_train = 512 if quick else 1024
    n_val = 128
    model = edge_vision.EdgeVisionDetector()
    opt = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    epochs = 8 if quick else 24
    batch = 16

    def make_batch(n, seed0):
        imgs, tgts = [], []
        for k in range(n):
            img, labels = edge_vision.synth_scene(seed=seed0 + k)
            imgs.append(torch.from_numpy(img).permute(2, 0, 1).contiguous().float() / 255.0)
            tgt = edge_vision.encode_boxes(labels)
            tgts.append(torch.from_numpy(tgt))
        return torch.stack(imgs), torch.stack(tgts)

    for epoch in range(epochs):
        model.train()
        run_loss, tot = 0.0, 0
        for i in range(0, n_train, batch):
            imgs, tgts = make_batch(batch, seed0=1000 + (epoch * n_train + i))
            pred = model(imgs)
            loss = edge_vision.detection_loss(pred, tgts)
            opt.zero_grad()
            loss.backward()
            opt.step()
            run_loss += loss.item()
            tot += 1
        log(f"edge_vision epoch {epoch + 1}/{epochs} loss={run_loss / max(tot, 1):.4f}")
    path = os.path.join(WEIGHTS_DIR, "edge_vision.pt")
    torch.save({"state_dict": model.state_dict(), "name": "edge_vision"}, path)
    return {"model": "edge_vision", "path": path}


def train_gnn_router(quick: bool) -> dict:
    model = gnn_router.EdgeWeightPredictor(node_features=3, edge_features=3)
    opt = torch.optim.Adam(model.parameters(), lr=3e-3)
    loss_fn = nn.MSELoss()
    n_samples = 400 if quick else 1200
    epochs = 8 if quick else 15

    def sample(seed):
        rng = np.random.default_rng(seed)
        adj, edge_feats, positions = gnn_router.make_road_graph(seed=seed)
        N = adj.shape[0]
        origin = int(rng.integers(0, N))
        origin_pos = positions[origin]  # (2,)
        dist = np.linalg.norm(positions - origin_pos, axis=1)          # (N,)
        node_hazard = 1.0 / (1.0 + dist)                                # (N,) proximity
        src, dst = np.nonzero(adj)                                       # numpy: (E,) each
        # per-edge hazard = max of the two endpoints' proximity
        e_hazard = np.maximum(node_hazard[src], node_hazard[dst])       # (E,)
        e_cong = np.clip(edge_feats[src, dst, 0] * 0.6 + 0.4 * e_hazard, 0, 1)
        target = np.stack([e_cong, e_hazard], axis=-1)                  # (E,2)
        return (
            torch.from_numpy(adj).float(),
            torch.from_numpy(edge_feats).float(),
            torch.from_numpy(origin_pos).float(),
            torch.from_numpy(target).float(),
        )

    for epoch in range(epochs):
        model.train()
        run_loss, tot = 0.0, 0
        for k in range(n_samples):
            adj, ef, hpos, tgt = sample(seed=epoch * n_samples + k)
            pred = model(adj, ef, hpos)
            loss = loss_fn(pred, tgt)
            opt.zero_grad()
            loss.backward()
            opt.step()
            run_loss += loss.item()
            tot += 1
        log(f"gnn_router epoch {epoch + 1}/{epochs} loss={run_loss / max(tot, 1):.4f}")
    path = os.path.join(WEIGHTS_DIR, "gnn_router.pt")
    torch.save({"state_dict": model.state_dict(), "name": "gnn_router"}, path)
    return {"model": "gnn_router", "loss": run_loss / max(tot, 1), "path": path}


_SOS, _EOS, _PAD = dex_llm.SOS, dex_llm.EOS, dex_llm.PAD


def _dextrain(quick: bool):
    n = 700 if quick else 1200
    max_len = 80
    inputs, targets = dex_llm.generate_dex_dataset(n=n, max_len=max_len)
    vocab = dex_llm.CharVocab(inputs + targets)
    model = dex_llm.DeXTransformer(vocab_size=vocab.vocab_size, max_len=max_len)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.CrossEntropyLoss(ignore_index=_PAD)
    epochs = 4 if quick else 16
    batch = 64

    # Pre-encode the whole dataset once (not per epoch) for CPU speed.
    encoded = [
        (
            torch.tensor(vocab.encode(inputs[i], max_len), dtype=torch.long),
            torch.tensor(vocab.encode(targets[i], max_len), dtype=torch.long),
        )
        for i in range(n)
    ]

    for epoch in range(epochs):
        model.train()
        perm = np.random.permutation(n)
        tot_loss, tot = 0.0, 0
        for i in range(0, n, batch):
            idx = perm[i:i + batch]
            src = torch.stack([encoded[int(j)][0] for j in idx])
            tgt = torch.stack([encoded[int(j)][1] for j in idx])
            logits = model(src, tgt)
            # Next-token prediction: logits[:, t] must predict tgt[:, t+1].
            loss = loss_fn(logits[:, :-1, :].reshape(-1, logits.size(-1)), tgt[:, 1:].reshape(-1))
            opt.zero_grad()
            loss.backward()
            opt.step()
            tot_loss += loss.item() * len(idx)
            tot += len(idx)
        log(f"dex_llm epoch {epoch + 1}/{epochs} loss={tot_loss / max(tot, 1):.4f}")

    # Validity check: strict JSON first, then deterministic repair pass.
    model.eval()
    strict = repaired = 0
    n_eval = min(80, n)
    with torch.no_grad():
        for k in range(n_eval):
            s = encoded[k][0]
            out = model.generate(s.unsqueeze(0), max_len=max_len, sos_token=_SOS, eos_token=_EOS)
            text = vocab.decode(out[0])
            if dex_llm.validate_json_output(text) is not None:
                strict += 1
            elif dex_llm.parse_output(text) is not None:
                repaired += 1
    log(f"dex_llm valid-json strict={strict}/{n_eval} repaired={strict + repaired}/{n_eval}")
    return model, vocab, (strict + repaired) / n_eval


def train_dex_llm(quick: bool) -> dict:
    model, vocab, validity = _dextrain(quick)
    path = os.path.join(WEIGHTS_DIR, "dex_llm.pt")
    torch.save(
        {
            "state_dict": model.state_dict(),
            "char2idx": vocab.char2idx,
            "idx2char": vocab.idx2char,
            "name": "dex_llm",
            "max_len": 80,
        },
        path,
    )
    return {"model": "dex_llm", "valid_json_rate": validity, "path": path}


def train_preparedness(quick: bool) -> dict:
    n = 800 if quick else 1500
    inputs, outputs = preparedness.generate_preparedness_dataset(n=n)
    vocab = dex_llm.CharVocab(inputs + outputs)  # reuse char vocab
    model = preparedness.PreparednessGenerator(vocab_size=vocab.vocab_size, max_len=128)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.CrossEntropyLoss(ignore_index=0)
    epochs = 3 if quick else 8
    batch = 32
    max_len = 96

    pairs = []
    for i in range(n):
        pairs.append((
            torch.tensor(vocab.encode(inputs[i], max_len), dtype=torch.long),
            torch.tensor(vocab.encode(outputs[i], max_len), dtype=torch.long),
        ))

    for epoch in range(epochs):
        model.train()
        perm = np.random.permutation(n)
        tt, ttot = 0.0, 0
        for i in range(0, n, batch):
            idx = perm[i:i + batch]
            sb, tb = [], []
            for j in idx:
                sb.append(pairs[int(j)][0])
                tb.append(pairs[int(j)][1])
            src = torch.stack(sb)
            tgt = torch.stack(tb)
            logits = model(src, tgt)
            loss = loss_fn(logits[:, :-1, :].reshape(-1, logits.size(-1)), tgt[:, 1:].reshape(-1))
            opt.zero_grad()
            loss.backward()
            opt.step()
            tt += loss.item() * len(idx)
            ttot += len(idx)
        log(f"preparedness epoch {epoch + 1}/{epochs} loss={tt / max(ttot, 1):.4f}")
    path = os.path.join(WEIGHTS_DIR, "preparedness.pt")
    torch.save(
        {
            "state_dict": model.state_dict(),
            "char2idx": vocab.char2idx,
            "idx2char": vocab.idx2char,
            "name": "preparedness",
            "max_len": 96,
        },
        path,
    )
    return {"model": "preparedness", "path": path}


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Bharat Resilio models from scratch")
    parser.add_argument("--quick", action="store_true", help="reduced epochs/samples for a fast smoke run")
    parser.add_argument("--only", nargs="*", default=None, help="e.g. --only bedwum hazard")
    args = parser.parse_args()

    os.makedirs(WEIGHTS_DIR, exist_ok=True)
    log(f"device={DEVICE} torch={torch.__version__}")
    torch.manual_seed(0)
    np.random.seed(0)

    results = []
    t0 = time.time()
    tasks = [
        ("bedwum", train_bedwum),
        ("hazard", train_hazard),
        ("edge_vision", train_edge_vision),
        ("gnn_router", train_gnn_router),
        ("dex_llm", train_dex_llm),
        ("preparedness", train_preparedness),
    ]
    for name, fn in tasks:
        if args.only and name not in args.only:
            continue
        started = time.time()
        try:
            res = fn(args.quick)
            res.setdefault("model", name)
            res["elapsed_s"] = round(time.time() - started, 1)
            results.append(res)
            log(f"done {name} in {res['elapsed_s']}s")
        except Exception as exc:  # keep the pipeline alive
            log(f"FAILED {name}: {exc}")
            results.append({"model": name, "error": str(exc)})

    log("==============================================")
    log("training summary")
    for r in results:
        extra = {k: v for k, v in r.items() if k not in ("model", "path")}
        log(f"  {r.get('model', '?')}: {json.dumps(extra)}")
    log(f"total time: {time.time() - t0:.1f}s")
    log("weights written to " + WEIGHTS_DIR)


if __name__ == "__main__":
    main()