'use client';

import { useState } from 'react';

interface ContactFormProps {
  disabled?: boolean;
}

/**
 * RQ-05 / STEP-05: ContactForm presentational component.
 *
 * - Prop `disabled` defaults to `true` (DEC-06).
 * - When `disabled`: all fieldsets disabled, CTA disabled, helper text shown.
 *   **No validation when disabled. No API calls. No persist.**
 * - When NOT disabled (future): full validation + submit (future task backend).
 *
 * Validation/submit contract belongs to the backend contact task — AV6 (Homepage CMS)
 * does NOT own the contact backend.
 */
export function ContactForm({ disabled = true }: ContactFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // NOOP — form is presentational. Validation/submit is out of scope.
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={disabled} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="contact-name"
              className="font-label text-label-sm font-bold text-on-surface"
            >
              Họ và tên
            </label>
            <input
              id="contact-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập họ và tên"
              required={!disabled}
              disabled={disabled}
              className="hrp-focus w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-on-surface placeholder:text-on-surface-variant disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="contact-phone"
              className="font-label text-label-sm font-bold text-on-surface"
            >
              Điện thoại
            </label>
            <input
              id="contact-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại"
              required={!disabled}
              disabled={disabled}
              className="hrp-focus w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-on-surface placeholder:text-on-surface-variant disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="contact-message"
              className="font-label text-label-sm font-bold text-on-surface"
            >
              Nội dung
            </label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nhập nội dung liên hệ"
              rows={3}
              maxLength={1000}
              disabled={disabled}
              className="hrp-focus w-full resize-none rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-on-surface placeholder:text-on-surface-variant disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant"
            />
          </div>

          <button
            type="submit"
            disabled={disabled}
            className="hrp-btn-primary hrp-focus inline-flex min-h-11 items-center justify-center rounded-lg px-6 font-label text-label-md font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            GỬI NGAY
          </button>
        </fieldset>
      </form>

      {/* RQ-05 / DEC-06: Helper text when disabled */}
      {disabled && (
        <p className="flex items-start gap-1.5 font-body text-body-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-base shrink-0" aria-hidden="true">
            info
          </span>
          Tính năng đang được hoàn thiện. Vui lòng gọi hotline hoặc email.
        </p>
      )}
    </div>
  );
}
