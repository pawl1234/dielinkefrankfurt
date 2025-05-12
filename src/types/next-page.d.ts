import 'next';
import { AppType, NextComponentType } from 'next/types';

declare module 'next' {
  // Override the PageProps type to support our params format
  interface PageProps {
    params: Record<string, string>;
    searchParams?: Record<string, string | string[] | undefined>;
  }
}