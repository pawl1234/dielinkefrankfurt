import { Paper, Tabs, Tab } from '@mui/material';
import React from 'react';

interface AdminStatusTabsProps {
  value: number;
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
  tabs: string[];
}

const AdminStatusTabs: React.FC<AdminStatusTabsProps> = ({ value, onChange, tabs }) => {
  return (
    <Paper sx={{ p: 0, mb: 3 }}>
      <Tabs
        value={value}
        onChange={onChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
      >
        {tabs.map((tab, index) => (
          <Tab key={index} label={tab} />
        ))}
      </Tabs>
    </Paper>
  );
};

export default AdminStatusTabs;