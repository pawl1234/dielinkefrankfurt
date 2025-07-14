'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { LinkPerformanceTableProps } from '@/types/newsletter-analytics';

/**
 * Component for displaying link click performance in a table
 */
export default function LinkPerformanceTable({ 
  data 
}: LinkPerformanceTableProps) {
  if (data.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No link clicks recorded yet
        </Typography>
      </Box>
    );
  }

  const formatUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.hash;
    } catch {
      return url;
    }
  };

  const getLinkTypeColor = (linkType: string): 'default' | 'primary' | 'secondary' => {
    switch (linkType) {
      case 'appointment':
        return 'primary';
      case 'statusreport':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getLinkTypeLabel = (linkType: string): string => {
    switch (linkType) {
      case 'appointment':
        return 'Termin';
      case 'statusreport':
        return 'Statusbericht';
      default:
        return linkType;
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Link Performance - Clicks & Unique Clicks
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>URL</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Total Clicks</TableCell>
              <TableCell align="right">Unique Clicks</TableCell>
              <TableCell align="right">Unique Rate</TableCell>
              <TableCell>First Click</TableCell>
              <TableCell>Last Click</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((link, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {formatUrl(link.url)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getLinkTypeLabel(link.linkType)}
                    size="small"
                    color={getLinkTypeColor(link.linkType)}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body1" fontWeight="bold" color="primary">
                    {link.totalClicks}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body1" fontWeight="bold" color="success.main">
                    {link.uniqueClicks}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {link.uniqueClickRate.toFixed(1)}%
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {link.firstClick
                      ? format(new Date(link.firstClick), 'dd.MM.yyyy HH:mm', { locale: de })
                      : '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {link.lastClick
                      ? format(new Date(link.lastClick), 'dd.MM.yyyy HH:mm', { locale: de })
                      : '-'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}