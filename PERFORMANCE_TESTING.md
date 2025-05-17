# Performance Testing Plan

This document outlines the performance testing plan for the Groups and Status Reports features of Die Linke Frankfurt application. It defines metrics, tools, and procedures for measuring application performance.

## Metrics to Measure

### 1. Loading Time Metrics

- **Time to First Byte (TTFB)**: Time it takes for the browser to receive the first byte of response from the server
- **First Contentful Paint (FCP)**: Time until the first content is rendered on the screen
- **Largest Contentful Paint (LCP)**: Time until the largest content element is rendered
- **Time to Interactive (TTI)**: Time until the page becomes fully interactive
- **Total Blocking Time (TBT)**: Total time where the main thread is blocked
- **Cumulative Layout Shift (CLS)**: Measure of visual stability

### 2. Runtime Performance

- **Frame Rate**: Should maintain 60fps for smooth animations
- **Memory Usage**: Monitor memory consumption during extended usage
- **Long Tasks**: Count and duration of tasks that block the main thread for more than 50ms

### 3. Network Performance

- **Transfer Size**: Total size of resources downloaded
- **Resource Count**: Number of requests made
- **Cache Hit Rate**: Percentage of requests served from cache

### 4. Database Performance

- **Query Execution Time**: Time taken to execute database queries
- **Query Complexity**: Number of joins, conditions, and rows processed

### 5. Backend API Performance

- **Response Time**: Time taken for API endpoints to respond
- **Error Rate**: Percentage of failed requests
- **Throughput**: Number of requests processed per second

## Testing Environments

1. **Development**: Local testing during development
2. **Staging**: Pre-production environment with similar characteristics to production
3. **Production**: Monitoring of the live application

## Testing Tools

### Frontend Performance Testing

- **Lighthouse**: For overall performance scoring and recommendations
- **Chrome DevTools**: For detailed performance profiling
- **Web Vitals Library**: For tracking Core Web Vitals in production
- **Webpagetest.org**: For cross-browser and real-world performance testing

### Backend Performance Testing

- **k6**: For load testing API endpoints
- **Prisma Studio**: For monitoring database queries
- **Node.js Profiler**: For identifying backend bottlenecks

### Monitoring

- **Vercel Analytics**: For production monitoring of Web Vitals
- **Custom Performance Logging**: For tracking specific application metrics

## Testing Scenarios

### 1. Groups List Page

#### Baseline Tests
- Load Groups list page with 10 items
- Measure loading time, render time, and memory usage
- Profile network requests and cache hits

#### Stress Tests
- Load Groups list with 100+ items
- Test pagination functionality with 10, 25, and 50 items per page
- Test filtering and sorting operations
- Test with and without cache

### 2. Status Reports List Page

#### Baseline Tests
- Load Status Reports list page with 10 items
- Measure loading time, render time, and memory usage

#### Stress Tests
- Load Status Reports with 100+ items
- Test with multiple group filters applied
- Test with different sorting options
- Test with search functionality

### 3. File Upload/Download

- Test uploading single files of various sizes (1MB, 5MB, 10MB)
- Test uploading multiple files simultaneously
- Test downloading files of various sizes
- Measure throughput and response times

### 4. Form Submission

- Test form submission with minimal data
- Test form submission with complete data including file uploads
- Measure time from submission to completion
- Test error recovery and resubmission

## Performance Budgets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.0s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive | < 3.5s |
| Cumulative Layout Shift | < 0.1 |
| Total Blocking Time | < 300ms |
| API Response Time | < 500ms |
| Bundle Size (main) | < 150KB |
| Bundle Size (total) | < 500KB |

## Test Data Generation

For accurate performance testing, we need realistic test data:

```javascript
// Generate test data for Groups
const generateGroups = (count) => {
  const groups = [];
  for (let i = 0; i < count; i++) {
    groups.push({
      name: `Test Group ${i}`,
      slug: `test-group-${i}`,
      description: `This is a test group description for group ${i}. It contains enough text to simulate a real description.`.repeat(3),
      status: ['NEW', 'ACTIVE', 'ARCHIVED'][Math.floor(Math.random() * 3)],
      logoUrl: i % 3 === 0 ? `https://example.com/logo-${i}.png` : null,
      responsiblePersons: Array(Math.floor(Math.random() * 3) + 1).fill(0).map((_, j) => ({
        firstName: `First${j}`,
        lastName: `Last${j}`,
        email: `person${j}@example.com`
      }))
    });
  }
  return groups;
};

// Generate test data for Status Reports
const generateStatusReports = (count, groupIds) => {
  const reports = [];
  for (let i = 0; i < count; i++) {
    const groupId = groupIds[Math.floor(Math.random() * groupIds.length)];
    reports.push({
      title: `Test Report ${i}`,
      content: `This is the content for test report ${i}. It contains detailed information about the group activities.`.repeat(5),
      reporterFirstName: `Reporter${i}`,
      reporterLastName: `LastName${i}`,
      status: ['NEW', 'ACTIVE', 'ARCHIVED'][Math.floor(Math.random() * 3)],
      groupId,
      fileUrls: i % 4 === 0 ? JSON.stringify([`https://example.com/file-${i}.pdf`]) : null
    });
  }
  return reports;
};
```

## Baseline Measurements

Before implementing any optimizations, establish baseline performance:

- **Groups List (10 items)**: Document loading times, bundle size, and database query time
- **Groups List (100 items)**: Document performance degradation with larger data sets
- **Status Reports List**: Document similar metrics for the Status Reports feature
- **Form Submission**: Measure form submission performance with and without file uploads

## Regular Testing Schedule

- **Development**: Run performance tests after significant changes
- **Pre-release**: Complete full performance test suite before deploying to production
- **Production**: Monitor performance daily with automated alerts for regressions

## Reporting

Performance test results should be documented with:

- Date and time of the test
- Environment details
- Test scenario and data size
- Results for each metric
- Screenshots or videos of user experience
- Recommendations for improvements

## Continuous Improvement

This performance testing plan should be reviewed and updated regularly as the application evolves. New features should include performance budgets and testing scenarios.