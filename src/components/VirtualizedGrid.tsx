import React, { useState, useEffect, useRef } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Box, CircularProgress, Typography } from '@mui/material';

interface VirtualizedGridProps<T> {
  items: T[];
  loading: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  itemWidth?: number;
  columnCount?: number;
  emptyMessage?: string;
  loadingMessage?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A virtualized grid component that efficiently renders only visible cells
 * for large datasets, improving performance and reducing memory usage.
 */
export function VirtualizedGrid<T>({
  items,
  loading,
  renderItem,
  itemHeight = 300, // Default height for each cell
  columnCount: propColumnCount,
  emptyMessage = 'No items found.',
  loadingMessage = 'Loading items...',
  className,
  style
}: VirtualizedGridProps<T>) {
  const [overscanCount, setOverscanCount] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(800);
  const [columnCount, setColumnCount] = useState(propColumnCount || 3);

  // Adjust overscan and columns based on viewport size
  useEffect(() => {
    const handleResize = () => {
      // Update overscan based on screen size
      if (window.innerHeight > 1080) {
        setOverscanCount(2);
      } else {
        setOverscanCount(1);
      }
      
      // Update column count based on screen width if not provided as prop
      if (!propColumnCount) {
        if (window.innerWidth < 600) {
          setColumnCount(1);
        } else if (window.innerWidth < 960) {
          setColumnCount(2);
        } else if (window.innerWidth < 1280) {
          setColumnCount(3);
        } else {
          setColumnCount(4);
        }
      }
      
      // Update container height based on parent
      if (containerRef.current?.parentElement) {
        const parentHeight = containerRef.current.parentElement.clientHeight;
        setContainerHeight(parentHeight || 800);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call once initially
    
    return () => window.removeEventListener('resize', handleResize);
  }, [propColumnCount]);

  // Calculate row count based on items length and column count
  const rowCount = Math.ceil(items.length / columnCount);

  // Cell renderer function for react-window
  const Cell = ({ columnIndex, rowIndex, style: cellStyle }: { 
    columnIndex: number; 
    rowIndex: number; 
    style: React.CSSProperties 
  }) => {
    const itemIndex = rowIndex * columnCount + columnIndex;
    
    // Only render if the item exists
    if (itemIndex < items.length) {
      return (
        <div style={{
          ...cellStyle,
          padding: '8px',
        }}>
          {renderItem(items[itemIndex], itemIndex)}
        </div>
      );
    }
    
    return null;
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

  // Render virtualized grid
  return (
    <Box 
      ref={containerRef} 
      className={className} 
      style={{ height: '100%', minHeight: '600px', ...style }}
    >
      <AutoSizer>
        {({ height, width }) => (
          <Grid
            columnCount={columnCount}
            columnWidth={width / columnCount}
            height={height || containerHeight}
            rowCount={rowCount}
            rowHeight={itemHeight}
            width={width}
            overscanRowCount={overscanCount}
          >
            {Cell}
          </Grid>
        )}
      </AutoSizer>
    </Box>
  );
}