function BrandMark() {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600 text-white sm:h-11 sm:w-11"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 sm:h-7 sm:w-7"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 10.5L12 4L21 10.5V20H3V10.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 13H15M10 16.5H14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="flex flex-col leading-tight ">
        <span className="text-sm font-semibold text-slate-900 sm:text-base">Multi-Store</span>
        <span className="text-sm font-semibold text-slate-900 sm:text-base">Ecommerce Platform</span>
      </div>
    </div>
  )
}

export default BrandMark
