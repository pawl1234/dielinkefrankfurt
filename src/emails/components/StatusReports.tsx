import { Img, Text, Heading, Section, Row, Column, Hr } from '@react-email/components';
import { GroupWithReports } from '../../types/newsletter-types';
import { Button } from './Button';
import { formatDate, truncateText } from '../../lib/newsletter-helpers';
import { colors, typography, spacing, baseStyles, emailClientStyles } from '../utils/styles';

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
          <Section key={group.id} style={{ marginBottom: spacing.md }}>
            {/* Group Header */}
            <Row style={{ marginBottom: spacing.md }}>
              <Column
                style={{
                  width: '60px',
                  verticalAlign: 'top',
                  paddingRight: '15px'
                }}
              >
                {groupLogo ? (
                  <Img
                    src={groupLogo}
                    alt={`${group.name} Logo`}
                    style={{
                      display: 'block',
                      borderRadius: '50%',
                      width: '60px',
                      height: '60px',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <Section
                    style={{
                      borderRadius: '50%',
                      backgroundColor: colors.primary,
                      color: colors.text.white,
                      width: '60px',
                      height: '60px',
                      textAlign: 'center',
                      lineHeight: '60px'
                    }}
                  >
                    <Text
                      style={{
                        fontSize: typography.fontSize['2xl'],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.text.white,
                        margin: '0',
                        lineHeight: '60px',
                        textAlign: 'center'
                      }}
                    >
                      {firstLetter}
                    </Text>
                  </Section>
                )}
              </Column>
              <Column style={{ verticalAlign: 'top' }}>
                <Heading
                  as="h3"
                  style={{
                    fontSize: '20px',
                    color: "#333333",
                    marginTop: '18px',
                    marginBottom: '10px',
                  }}
                >
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
                    padding: `0 0 ${spacing.lg} 0`,
                    marginBottom: isLastReport && !isLastGroup ? '0' : spacing.lg
                  }}
                >
                  <Row>
                    <Column>
                      <Heading
                        as="h4"
                        style={{
                          fontSize: "18px",
                          fontWeight: "bold",
                          color: "#333333",
                          margin: '0 0 10px 0',
                        }}
                      >
                        {report.title}
                      </Heading>
                      
                      <Text
                        style={{
                          ...baseStyles.text.small,
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.bold,
                          color: colors.text.secondary,
                          margin: `0 0 ${spacing.sm} 0`
                        }}
                      >
                        {formatDate(report.createdAt)}
                        {report.reporterFirstName && report.reporterLastName && 
                          ` | ${report.reporterFirstName} ${report.reporterLastName}`
                        }
                      </Text>
                      
                      <Text
                        style={{
                          ...baseStyles.text.base,
                          fontSize: typography.fontSize.base,
                          color: colors.text.primary,
                          lineHeight: typography.lineHeight.relaxed,
                          margin: `0 0 ${spacing.md} 0`
                        }}
                      >
                        {truncatedContent.replace(/<[^>]*>/g, '')}
                      </Text>
                      
                      <Button href={reportUrl}/>
                    </Column>
                  </Row>
                  
                  {/* Report separator (dashed line) 
                  {!isLastReport && (
                    <Hr/>
                  )}*/}
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