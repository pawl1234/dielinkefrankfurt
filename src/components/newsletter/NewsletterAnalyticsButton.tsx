'use client';

import React from 'react';
import { Button } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import { useRouter } from 'next/navigation';
import { NewsletterAnalyticsButtonProps } from '@/types/newsletter-analytics';

/**
 * Button component to navigate to newsletter analytics
 */
export default function NewsletterAnalyticsButton({
  newsletterId,
  variant = 'outlined',
  size = 'small',
}: NewsletterAnalyticsButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/admin/newsletter/analytics/${newsletterId}`);
  };

  return (
    <Button
      variant={variant}
      size={size}
      color="primary"
      startIcon={<BarChartIcon />}
      onClick={handleClick}
    >
      Analytics
    </Button>
  );
}