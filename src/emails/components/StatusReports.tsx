import { Img, Text, Heading, Section, Row, Column } from '@react-email/components';
import { GroupWithReports } from '../../types/newsletter-types';
import { Button } from './Button';
import { formatDate, truncateText } from '../../lib/newsletter-helpers';

interface StatusReportsProps {
  groups: GroupWithReports[];
  baseUrl: string;
}

/**
 * Status reports section showing group reports with logos and content.
 * Uses React Email components for better email client compatibility.
 */
export function StatusReports({ groups, baseUrl }: StatusReportsProps) {
  if (!groups || groups.length === 0) {
    return null;
  }

  return (
    <>
      {groups.map((groupWithReports, groupIndex) => {
        const { group, reports } = groupWithReports;
        const isLastGroup = groupIndex === groups.length - 1;
        
        // Group logo handling
        const groupLogo = group.logoUrl;
        const firstLetter = group.name.charAt(0).toUpperCase();

        return (
          <Section key={group.id} style={groupSection}>
            {/* Group Header */}
            <Row style={headerRow}>
              <Column style={logoColumn}>
                {groupLogo ? (
                  <Img
                    src={groupLogo}
                    alt={`${group.name} Logo`}
                    style={logoImage}
                  />
                ) : (
                  <Section style={logoCircle}>
                    <Text style={logoText}>
                      {firstLetter}
                    </Text>
                  </Section>
                )}
              </Column>
              <Column style={nameColumn}>
                <Heading as="h3" style={groupHeading}>
                  {group.name}
                </Heading>
              </Column>
            </Row>

            {/* Reports for this group */}
            {reports.map((report, reportIndex) => {
              const reportUrl = `${baseUrl}/gruppen/${group.slug}#report-${report.id}`;
              const truncatedContent = truncateText(report.content);
              const isLastReport = reportIndex === reports.length - 1;

              return (
                <Section 
                  key={report.id}
                  style={{
                    padding: `0 0 20px 0`,
                    marginBottom: isLastReport && !isLastGroup ? '0' : '20px'
                  }}
                >
                  <Row>
                    <Column>
                      <Heading as="h4" style={reportHeading}>
                        {report.title}
                      </Heading>
                      
                      <Text style={reportMeta}>
                        {formatDate(report.createdAt)}
                        {report.reporterFirstName && report.reporterLastName && 
                          ` | ${report.reporterFirstName} ${report.reporterLastName}`
                        }
                      </Text>
                      
                      <Text style={reportContent}>
                        {truncatedContent.replace(/<[^>]*>/g, '')}
                      </Text>

                    </Column>
                  </Row>
                  <Row> 
                    <Button href={reportUrl}>Mehr Infos</Button>
                  </Row>
                </Section>
              );
            })}

            {/* Group separator (red line) 
            {!isLastGroup && (
              <Section style={{ margin: `${spacing['2xl']} 0` }}>
                <Row>
                  <Column>
                    <Hr 
                      style={{
                        border: 'none',
                        borderTop: `2px solid ${colors.primary}`,
                        margin: `${spacing.md} 0`
                      }}
                    />
                  </Column>
                </Row>
              </Section>
            )} */}
          </Section>
        );
      })}
    </>
  );
}

// Styles following React Email and apple.tsx patterns
const groupSection = {
  marginBottom: '15px'
};

const headerRow = {
  marginBottom: '15px'
};

const logoColumn = {
  width: '60px',
  verticalAlign: 'top',
  paddingRight: '15px'
};

const logoImage = {
  display: 'block',
  borderRadius: '50%',
  width: '60px',
  height: '60px',
  objectFit: 'cover' as const,
};

const logoCircle = {
  borderRadius: '50%',
  backgroundColor: '#FF0000',
  color: '#FFFFFF',
  width: '60px',
  height: '60px',
  textAlign: 'center' as const,
  lineHeight: '60px'
};

const logoText = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#FFFFFF',
  margin: '0',
  lineHeight: '60px',
  textAlign: 'center' as const
};

const nameColumn = {
  verticalAlign: 'top'
};

const groupHeading = {
  fontSize: '20px',
  color: "#333333",
  marginTop: '18px',
  marginBottom: '10px',
};

const reportHeading = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#333333",
  margin: '0 0 10px 0',
};

const reportMeta = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#666666',
  margin: '0 0 10px 0'
};

const reportContent = {
  fontSize: '16px',
  color: '#333333',
  lineHeight: '1.5',
  margin: '0 0 15px 0'
};