import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-0 px-4 py-2 text-sm font-semibold transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:scale-105 shadow-soft",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-eco text-white shadow-floating hover:shadow-glow-eco",
        secondary:
          "bg-secondary/80 text-secondary-foreground hover:bg-secondary shadow-soft backdrop-blur-sm",
        destructive:
          "bg-gradient-danger text-white shadow-floating hover:shadow-xl",
        outline:
          "text-foreground border border-primary/30 hover:bg-primary hover:text-white backdrop-blur-sm",
        accent:
          "bg-gradient-to-r from-eco-beige to-eco-coral text-eco-forest shadow-floating hover:shadow-glow",
        success: "bg-gradient-success text-white shadow-floating",
        warning: "bg-gradient-warning text-eco-forest shadow-floating",
        // Legacy variants
        gold: "bg-gradient-to-r from-eco-beige to-eco-coral text-eco-forest shadow-floating",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
