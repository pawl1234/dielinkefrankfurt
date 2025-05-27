import React from 'react';

export const metadata = {
  title: 'Newsletter Archives - Admin Dashboard',
  description: 'View and manage sent newsletters'
};

export default function NewsletterArchivesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}