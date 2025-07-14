'use client';

import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { MetricCardProps } from '@/types/newsletter-analytics';

/**
 * Component for displaying a single metric in a card format
 */
export default function MetricCard({ 
  title, 
  value, 
  subtitle, 
  color = 'primary' 
}: MetricCardProps) {
  const getColorValue = () => {
    switch (color) {
      case 'primary':
        return '#FF0000'; // Die Linke red
      case 'secondary':
        return '#666666';
      case 'success':
        return '#4caf50';
      case 'error':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      case 'info':
        return '#2196f3';
      default:
        return '#FF0000';
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography color="text.secondary" gutterBottom variant="h6">
          {title}
        </Typography>
        <Typography 
          variant="h3" 
          component="div"
          sx={{ 
            color: getColorValue(),
            fontWeight: 'bold',
            my: 2
          }}
        >
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}