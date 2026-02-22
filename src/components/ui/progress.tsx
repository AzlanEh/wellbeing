import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = ({ className, value, indicatorClassName, color, ref, ...props }: React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { indicatorClassName?: string; color?: string; ref?: React.Ref<React.ElementRef<typeof ProgressPrimitive.Root>> }) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-muted/60",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out",
        indicatorClassName
      )}
      style={{ 
         transform: `translateX(-${100 - (value || 0)}%)`,
         ...(color && { background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)` })
      }}
    />
  </ProgressPrimitive.Root>
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
