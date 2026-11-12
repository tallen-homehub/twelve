import Image from "next/image";

/** RUN XII mark. Replace public/brand/*.png with the original vector files when Chase sends them. */
export function Logo({ tone = "light", width = 160 }: { tone?: "light" | "dark"; width?: number }) {
  const src = tone === "light" ? "/brand/runxii-white.png" : "/brand/runxii-black.png";
  return <Image src={src} alt="RUN XII" width={width} height={Math.round((width * 116) / 650)} priority />;
}
