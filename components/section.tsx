import type { ReactNode } from "react"

export interface SectionProps {
  index?: string
  label?: string
  title: ReactNode
  lede?: ReactNode
  align?: "left" | "center"
  className?: string
  children?: ReactNode
}

/**
 * Editorial numbered section header — the HAVU pattern:
 * mono index + label, serif display headline, ruled lede.
 */
export function Section({ index, label, title, lede, align = "left", className = "", children }: SectionProps) {
  const centered = align === "center"
  return (
    <section className={`px-4 sm:px-6 lg:px-8 ${className}`}>
      <div className={`max-w-7xl mx-auto ${centered ? "text-center" : ""}`}>
        {(index || label) && (
          <p className={`kicker ${centered ? "justify-center" : ""}`}>
            {index ? <span className="mr-3 font-mono tabular-nums">{index}</span> : null}
            {label ? <span>— {label}</span> : null}
          </p>
        )}
        <h2 className="display mt-4 text-3xl sm:text-4xl md:text-[2.75rem] leading-tight tracking-tight text-foreground">
          {title}
        </h2>
        {lede ? (
          <p className={`mt-5 text-base md:text-lg leading-relaxed text-muted-foreground ${centered ? "mx-auto" : ""} max-w-3xl`}>
            {lede}
          </p>
        ) : null}
        {children ? <div className={`${centered ? "flex flex-col items-center" : ""}`}>{children}</div> : null}
      </div>
    </section>
  )
}

export function Rule({ className = "" }: { className?: string }) {
  return <div className={`rule max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`} />
}