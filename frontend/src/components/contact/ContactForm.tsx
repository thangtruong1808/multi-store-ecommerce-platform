import { useState } from 'react'
import { z } from 'zod'
import { FiCheckCircle, FiMail, FiMessageSquare, FiPhone, FiSend, FiTag, FiUser } from 'react-icons/fi'

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter at least 2 characters'),
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z
    .string()
    .trim()
    .refine((val) => val.length === 0 || val.length >= 8, {
      message: 'If provided, use at least 8 characters',
    }),
  subject: z.string().trim().min(3, 'Add a short subject (at least 3 characters)'),
  message: z
    .string()
    .trim()
    .min(20, 'Please write at least 20 characters so we can help')
    .max(4000, 'Message is too long (max 4000 characters)'),
})

type ContactFormValues = z.infer<typeof contactSchema>

const initialValues: ContactFormValues = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
}

function inputClass(hasError: boolean) {
  return hasError
    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
    : 'border-slate-300 focus:border-sky-500 focus:ring-sky-100'
}

export function ContactForm() {
  const [values, setValues] = useState<ContactFormValues>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormValues, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof ContactFormValues, boolean>>>({})
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const showError = (key: keyof ContactFormValues) =>
    Boolean(errors[key]) && (Boolean(touched[key]) || attemptedSubmit)

  const handleChange = (field: keyof ContactFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    setSubmitted(false)
  }

  const handleBlur = (field: keyof ContactFormValues) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAttemptedSubmit(true)

    const parsed = contactSchema.safeParse(values)
    if (!parsed.success) {
      const next: Partial<Record<keyof ContactFormValues, string>> = {}
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof ContactFormValues | undefined
        if (k) next[k] = issue.message
      }
      setErrors(next)
      return
    }

    setIsSending(true)
    setErrors({})
    // Demo: no backend contact endpoint yet — simulate network delay
    await new Promise((r) => setTimeout(r, 600))
    setIsSending(false)
    setSubmitted(true)
    setValues(initialValues)
    setTouched({})
    setAttemptedSubmit(false)
  }

  if (submitted) {
    return (
      <div
        className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/95 to-white p-6 shadow-lg shadow-emerald-900/5 sm:p-8"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-4">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <FiCheckCircle className="h-8 w-8" aria-hidden="true" />
          </span>
          <div className="mt-4 min-w-0 sm:mt-0">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Message sent</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Thanks for reaching out. We’ve received your note and will reply as soon as we can.
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-5 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-sky-200 hover:bg-slate-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-sky-500/40"
            >
              Send another message
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form
      className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-8"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Contact form"
    >
      <div className="grid gap-5 sm:gap-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-name" className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <FiUser className="h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
              Full name
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              autoComplete="name"
              value={values.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              disabled={isSending}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:ring ${inputClass(showError('name'))}`}
              placeholder="Jane Doe"
              aria-invalid={showError('name')}
              aria-describedby={showError('name') ? 'contact-name-error' : undefined}
            />
            {showError('name') ? (
              <p id="contact-name-error" className="text-xs text-rose-600">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-email" className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <FiMail className="h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
              Email
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              disabled={isSending}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:ring ${inputClass(showError('email'))}`}
              placeholder="you@example.com"
              aria-invalid={showError('email')}
              aria-describedby={showError('email') ? 'contact-email-error' : undefined}
            />
            {showError('email') ? (
              <p id="contact-email-error" className="text-xs text-rose-600">
                {errors.email}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-phone" className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <FiPhone className="h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
            Phone <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
            disabled={isSending}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:ring ${inputClass(showError('phone'))}`}
            placeholder="+61 400 000 000"
            aria-invalid={showError('phone')}
            aria-describedby={showError('phone') ? 'contact-phone-error' : undefined}
          />
          {showError('phone') ? (
            <p id="contact-phone-error" className="text-xs text-rose-600">
              {errors.phone}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-subject" className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <FiTag className="h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
            Subject
          </label>
          <input
            id="contact-subject"
            name="subject"
            type="text"
            value={values.subject}
            onChange={(e) => handleChange('subject', e.target.value)}
            onBlur={() => handleBlur('subject')}
            disabled={isSending}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:ring ${inputClass(showError('subject'))}`}
            placeholder="Order question, return, …"
            aria-invalid={showError('subject')}
            aria-describedby={showError('subject') ? 'contact-subject-error' : undefined}
          />
          {showError('subject') ? (
            <p id="contact-subject-error" className="text-xs text-rose-600">
              {errors.subject}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-message" className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <FiMessageSquare className="h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
            Message
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={6}
            value={values.message}
            onChange={(e) => handleChange('message', e.target.value)}
            onBlur={() => handleBlur('message')}
            disabled={isSending}
            className={`min-h-[140px] w-full resize-y rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:ring sm:min-h-[160px] ${inputClass(showError('message'))}`}
            placeholder="How can we help?"
            aria-invalid={showError('message')}
            aria-describedby={showError('message') ? 'contact-message-error' : undefined}
          />
          {showError('message') ? (
            <p id="contact-message-error" className="text-xs text-rose-600">
              {errors.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">We usually respond within one business day.</p>
          <button
            type="submit"
            disabled={isSending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:min-w-[200px]"
          >
            {isSending ? (
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
            ) : (
              <FiSend className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {isSending ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </div>
    </form>
  )
}
