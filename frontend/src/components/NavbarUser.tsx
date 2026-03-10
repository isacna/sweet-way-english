import Image from "next/image";

export function NavbarUser() {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium text-[#1A1A1A]">Teacher Julio</p>
        <p className="text-xs text-[#4A4A4A]">Professor</p>
      </div>
      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
        <span className="text-[#4A4A4A] font-medium text-sm">J</span>
      </div>
      <button
        type="button"
        className="p-1 text-[#4A4A4A] hover:text-[#1A1A1A]"
        aria-label="Menu"
      >
        <Image src="/icons/chevron-down.svg" alt="" width={16} height={16} />
      </button>
    </div>
  );
}
