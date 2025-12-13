import { cn } from "@/lib/utils"
import { type VariantProps, cva } from "class-variance-authority"
import * as React from "react"

const buttonGroupVariants = cva(
    "inline-flex -space-x-px rounded-md shadow-sm shadow-black/5 rtl:space-x-reverse",
    {
        variants: {
            active: {
                true: "border-primary z-10",
            },
        },
        defaultVariants: {
            active: false,
        },
    }
)

export interface ButtonGroupProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof buttonGroupVariants> { }

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
    ({ className, active, ...props }, ref) => {
        return (
            <div
                className={cn(buttonGroupVariants({ active }), className)}
                ref={ref}
                {...props}
            />
        )
    }
)
ButtonGroup.displayName = "ButtonGroup"

export { ButtonGroup, buttonGroupVariants }
