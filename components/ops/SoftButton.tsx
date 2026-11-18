"use client";

import Button, { type ButtonProps } from "@mui/material/Button";
import type { ReactNode } from "react";

type Variant = "default" | "primary" | "success" | "danger" | "ghost";

type Props = Omit<ButtonProps, "variant" | "size" | "color"> & {
  variant?: Variant;
  size?: "default" | "lg";
  loading?: boolean;
  children: ReactNode;
};

const variantProps: Record<Variant, Pick<ButtonProps, "variant" | "color">> = {
  default: { variant: "outlined", color: "primary" },
  primary: { variant: "contained", color: "primary" },
  success: { variant: "contained", color: "success" },
  danger: { variant: "contained", color: "error" },
  ghost: { variant: "text", color: "inherit" },
};

export function SoftButton({
  variant = "default",
  size = "default",
  loading,
  children,
  type = "button",
  ...rest
}: Props) {
  return (
    <Button
      type={type}
      loading={loading}
      loadingPosition="start" // keep the label visible while saving
      size={size === "lg" ? "large" : "medium"}
      {...variantProps[variant]}
      {...rest}
    >
      {children}
    </Button>
  );
}
