import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline:
          "border border-foreground text-foreground hover:bg-muted",
        success:
          "border-transparent bg-green-500 text-white hover:bg-green-600",
        warning:
          "border-transparent bg-yellow-500 text-black hover:bg-yellow-600",
        info:
          "border-transparent bg-blue-500 text-white hover:bg-blue-600",
        ghost:
          "bg-transparent text-foreground hover:bg-muted",
        link:
          "text-primary underline-offset-4 hover:underline",
        muted:
          "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
        disabled:
          "border-transparent bg-gray-300 text-gray-500 cursor-not-allowed opacity-50",
        gradient:
          "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700",
        glass:
          "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20",
        elevated:
          "bg-primary text-primary-foreground shadow-lg hover:shadow-xl",
        soft:
          "bg-primary/10 text-primary hover:bg-primary/20",
        subtle:
          "border-transparent bg-muted text-muted-foreground hover:bg-muted/60",

        // Role-Based Variants
        admin:
          "border-transparent bg-red-600 text-white hover:bg-red-700",  // Strong red for admin
        manager:
          "border-transparent bg-purple-600 text-white hover:bg-purple-700",  // Professional purple for managers
        inspector:
          "border-transparent bg-blue-500 text-white hover:bg-blue-600",  // Blue for inspectors
        employee:
          "border-transparent bg-green-500 text-white hover:bg-green-600",  // Green for employees
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
