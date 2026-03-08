import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
  {
    variants: {
      variant: {
        default: "border-accent bg-accent px-3 py-2 text-[#041014] shadow-sm hover:bg-accent-strong hover:text-white",
        secondary: "border-border bg-panel-strong px-3 py-2 text-foreground hover:border-accent/50 hover:bg-panel",
        ghost: "border-transparent px-3 py-2 text-foreground hover:bg-panel",
        subtle: "border-border/70 bg-panel/80 px-3 py-2 text-muted hover:text-foreground",
      },
      size: {
        default: "h-9",
        sm: "h-8 rounded-md px-2.5 text-xs",
        lg: "h-10 rounded-md px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
