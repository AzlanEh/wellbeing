import * as React from "react";

import { cn } from "@/lib/utils";

const Input = ({ className, type, ref, ...props }: React.ComponentProps<"input"> & { ref?: React.Ref<HTMLInputElement> }) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-full border border-input bg-transparent px-6 py-2 text-base shadow-sm",
          "transition-all duration-300",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "hover:border-primary",
          "md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  };
Input.displayName = "Input";

export { Input };
