import React from 'react';

export const metadata = {
  title: 'Newsletter Details - Admin Dashboard',
  description: 'View sent newsletter details'
};

export default function NewsletterDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}