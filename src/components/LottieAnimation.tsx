import { useRef, useEffect } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

interface LottieAnimationProps {
  animationData: unknown;
  loop?: boolean;
  className?: string;
  autoplay?: boolean;
}

export const LottieAnimation = ({
  animationData,
  loop = true,
  className,
  autoplay = true,
}: LottieAnimationProps) => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    if (autoplay && lottieRef.current) {
      lottieRef.current.play();
    }
  }, [autoplay]);

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={animationData}
      loop={loop}
      className={className}
      autoplay={autoplay}
    />
  );
};
