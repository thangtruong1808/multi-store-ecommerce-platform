import { FiHeadphones } from 'react-icons/fi'
import { ContactForm } from '../components/contact/ContactForm'

export default function ContactPage() {
  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-gradient-to-b from-slate-100/90 via-white to-slate-50/90">
      <div className="mx-auto min-w-0 w-full max-w-[min(100%,120rem)] px-4 pb-12 pt-6 md:px-6 md:pb-16 md:pt-8 xl:px-8">
        <div className="mx-auto min-w-0 w-full max-w-4xl">
          <header className="mb-8 border-b border-slate-200/80 pb-6 md:mb-10 md:pb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <h1 className="flex flex-wrap items-center gap-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                    <FiHeadphones className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
                  </span>
                  <span>Contact us</span>
                </h1>
                <p className="mt-3 max-w-7xl text-sm leading-relaxed text-slate-600 md:text-base">
                  Questions about an order, a product, or your account? Send us a message. we’re happy to help.
                </p>
              </div>
            </div>
          </header>

          <ContactForm />
        </div>
      </div>
    </div>
  )
}
