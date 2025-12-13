import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const InputGroup = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
    return (
        <div
            className={cn(
                "flex items-center w-full shadow-sm rounded-md",
                className
            )}
            ref={ref}
            {...props}
        />
    )
})
InputGroup.displayName = "InputGroup"

const InputGroupInput = React.forwardRef<
    HTMLInputElement,
    React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
    return (
        <Input
            className={cn(
                "rounded-none first:rounded-l-md last:rounded-r-md focus-visible:z-10",
                className
            )}
            ref={ref}
            {...props}
        />
    )
})
InputGroupInput.displayName = "InputGroupInput"

const InputGroupTextarea = React.forwardRef<
    HTMLTextAreaElement,
    React.ComponentProps<typeof Textarea>
>(({ className, ...props }, ref) => {
    return (
        <Textarea
            className={cn(
                "rounded-none first:rounded-t-md last:rounded-b-md focus-visible:z-10",
                className
            )}
            ref={ref}
            {...props}
        />
    )
})
InputGroupTextarea.displayName = "InputGroupTextarea"

const InputGroupAddon = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { align?: "inline-start" | "inline-end" | "block-start" | "block-end" }
>(({ className, align = "inline-start", children, ...props }, ref) => {
    // Basic styling for addon, focusing on inline connection
    return (
        <div
            ref={ref}
            className={cn(
                "flex items-center px-3 border border-input bg-muted text-sm text-muted-foreground",
                align === "inline-start" && "border-r-0 rounded-l-md",
                align === "inline-end" && "border-l-0 rounded-r-md",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
})
InputGroupAddon.displayName = "InputGroupAddon"

const InputGroupText = React.forwardRef<
    HTMLSpanElement,
    React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
    return (
        <span
            ref={ref}
            className={cn("whitespace-nowrap font-medium", className)}
            {...props}
        />
    )
})
InputGroupText.displayName = "InputGroupText"

export {
    InputGroup,
    InputGroupInput,
    InputGroupTextarea,
    InputGroupAddon,
    InputGroupText,
}
