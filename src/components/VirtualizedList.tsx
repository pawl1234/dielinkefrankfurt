import React, { useState, useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Box, CircularProgress, Typography } from '@mui/material';

interface VirtualizedListProps<T> {
  items: T[];
  loading: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  emptyMessage?: string;
  loadingMessage?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A virtualized list component that efficiently renders only visible items
 * for large datasets, improving performance and reducing memory usage.
 */
export function VirtualizedList<T>({
  items,
  loading,
  renderItem,
  itemHeight = 200, // Default height for each item
  emptyMessage = 'No items found.',
  loadingMessage = 'Loading items...',
  className,
  style
}: VirtualizedListProps<T>) {
  const [overscanCount, setOverscanCount] = useState(5);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);

  // Adjust overscan based on viewport size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerHeight > 1080) {
        setOverscanCount(8);
      } else if (window.innerHeight > 768) {
        setOverscanCount(5);
      } else {
        setOverscanCount(3);
      }
      
      // Update container height based on parent
      if (containerRef.current?.parentElement) {
        const parentHeight = containerRef.current.parentElement.clientHeight;
        setContainerHeight(parentHeight || 400);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call once initially
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Item renderer function for react-window
  const Row = ({ index, style: rowStyle }: { index: number; style: React.CSSProperties }) => {
    return (
      <div style={rowStyle}>
        {renderItem(items[index], index)}
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        py={3}
        className={className}
        style={style}
      >
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          {loadingMessage}
        </Typography>
      </Box>
    );
  }

  // Show empty state
  if (items.length === 0) {
    return (
      <Box 
        display="flex" 
        alignItems="center" 
        justifyContent="center" 
        py={3}
        className={className}
        style={style}
      >
        <Typography variant="body1" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  // Render virtualized list
  return (
    <Box 
      ref={containerRef} 
      className={className} 
      style={{ height: '100%', minHeight: '400px', ...style }}
    >
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height || containerHeight}
            width={width}
            itemCount={items.length}
            itemSize={itemHeight}
            overscanCount={overscanCount}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </Box>
  );
}