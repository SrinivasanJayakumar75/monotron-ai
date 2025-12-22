import { ReactNode } from "react";

interface SplitScrollLayoutProps {
  leftContent: ReactNode;
  rightContent: ReactNode;
  leftWidth?: string;
}

const SplitScrollLayout = ({
  leftContent,
  rightContent,
  leftWidth = "40%",
}: SplitScrollLayoutProps) => {
  return (
    <div className="flex min-h-screen w-full bg-gradient-to-b from-[#FFFFFF] to-[#D2DCFF]">
      {/* Sticky Left Side */}
      <div
        className="sticky top-0 h-screen flex items-center justify-center p-8 lg:p-12"
        style={{ width: leftWidth, minWidth: "300px" }}
      >
        <div className="w-full max-w-md">{leftContent}</div>
      </div>

      {/* Scrollable Right Side */}
      <div
        className="flex-1 overflow-y-auto p-8 lg:p-16"
        style={{ minWidth: "0" }}
      >
        <div className="max-w-2xl">{rightContent}</div>
      </div>
    </div>
  );
};

export default SplitScrollLayout;
