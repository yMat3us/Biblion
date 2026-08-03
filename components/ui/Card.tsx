import * as React from 'react'
import { cn } from '@/lib/utils'

type CardMaterial = 'default' | 'folio' | 'manuscript' | 'atlas' | 'marginalia' | 'cabinet' | 'administration'

const materialClasses: Record<CardMaterial, string> = {
  default: 'top-sheen rounded-[1.15rem] border border-hairline bg-[linear-gradient(180deg,rgb(255_255_255/0.02),transparent_34%),var(--color-surface)] shadow-soft',
  folio: 'folio-surface',
  manuscript: 'manuscript-surface',
  atlas: 'atlas-surface',
  marginalia: 'marginalia-surface',
  cabinet: 'cabinet-surface',
  administration: 'administration-surface',
}

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { hover?: boolean; glass?: boolean; material?: CardMaterial }
>(({ className, hover = false, glass = false, material = 'default', children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative',
      glass ? 'glass rounded-[1.15rem]' : materialClasses[material],
      'transition-[transform,border-color,background-color,box-shadow] duration-200',
      hover && 'panel-interactive',
      className,
    )}
    {...props}
  >
    {children}
  </div>
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 p-5 pb-4 sm:p-6 sm:pb-4', className)} {...props} />
  ),
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('font-semibold leading-tight tracking-[-0.02em] text-foreground', className)} {...props} />
  ),
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />
  ),
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />,
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />
  ),
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
