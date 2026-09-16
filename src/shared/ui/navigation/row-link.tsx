import React from 'react';
import Link from 'next/link';

export interface RowLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

/**
 * RowLink
 * Khắc phục lỗi nested-link (không bọc trọn <tr> bằng <a>).
 * Yêu cầu thẻ <tr> bọc ngoài phải có class "relative". Các interactive controls
 * khác trên cùng hàng cần có class "relative z-10".
 */
export function RowLink({ href, children, className, ...props }: RowLinkProps) {
  return (
    <Link
      href={href}
      className={`before:absolute before:inset-0 focus:outline-none focus:before:ring-2 focus:before:ring-inset focus:before:ring-primary ${className ?? ''}`}
      {...props}
    >
      {children}
    </Link>
  );
}
