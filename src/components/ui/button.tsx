import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 transform hover:scale-105 active:scale-95 relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-eco text-white shadow-floating hover:shadow-glow-eco border-0",
        destructive:
          "bg-gradient-danger text-white shadow-floating hover:shadow-xl",
        outline:
          "border-2 border-primary bg-transparent text-primary shadow-soft hover:bg-primary hover:text-white hover:shadow-glow-eco backdrop-blur-sm",
        secondary:
          "bg-secondary/80 text-secondary-foreground shadow-soft hover:bg-secondary hover:shadow-floating backdrop-blur-sm",
        ghost:
          "hover:bg-primary/10 hover:text-primary hover:shadow-glow-soft rounded-2xl",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80 transition-colors duration-200",
        accent:
          "bg-gradient-to-r from-eco-beige to-eco-coral text-eco-forest shadow-floating hover:shadow-glow border-0",
        success:
          "bg-gradient-success text-white shadow-floating hover:shadow-xl",
        warning:
          "bg-gradient-warning text-eco-forest shadow-floating hover:shadow-xl",
        // Legacy variants
        gold: "bg-gradient-to-r from-eco-beige to-eco-coral text-eco-forest shadow-floating border-0",
      },
      size: {
        default: "h-12 px-6 py-3 text-base",
        sm: "h-10 px-4 py-2 text-sm rounded-xl",
        lg: "h-14 px-8 py-4 text-lg rounded-3xl",
        icon: "h-12 w-12",
        "icon-sm": "h-10 w-10 rounded-xl",
        "icon-lg": "h-14 w-14 rounded-3xl",
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
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
