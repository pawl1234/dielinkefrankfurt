import { NextRequest, NextResponse } from 'next/server';
import prisma from './prisma';
import { Appointment, Group, StatusReport, NewsletterItem } from '@prisma/client';
import { 
  NewsletterSettings, 
  generateNewsletterHtml, 
  getDefaultNewsletterSettings 
} from './newsletter-template';
import { sendTestEmail } from './email';
import { serverErrorResponse } from './api-auth';
import { subWeeks } from 'date-fns';
import { getBaseUrl } from './base-url';
import { logger } from './logger';
import { handleDatabaseError, NewsletterNotFoundError, NewsletterValidationError } from './errors';
import { PaginatedResult } from './newsletter-archive';

// Smart caching for newsletter settings
let settingsCache: NewsletterSettings | null = null;

/**
 * Fix URLs in newsletter HTML content to ensure they have proper protocol
 */
export function fixUrlsInNewsletterHtml(html: string): string {
  if (!html) return html;
  
  const baseUrl = getBaseUrl();
  const domain = baseUrl.replace(/^https?:\/\//, '');
  
  // Fix URLs that are missing protocol
  // This regex finds href attributes with URLs that start with the domain but no protocol
  const urlPattern = new RegExp(`href=["']${domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^"']*?)["']`, 'g');
  
  const fixedHtml = html.replace(urlPattern, `href="${baseUrl}$1"`);
  
  // Log if any URLs were fixed
  const matchCount = (html.match(urlPattern) || []).length;
  if (matchCount > 0) {
    console.log(`Fixed ${matchCount} URLs in newsletter HTML to include protocol`);
  }
  
  return fixedHtml;
}

/**
 * Fetches newsletter settings from the database with smart caching
 * Creates default settings if none exist
 */
export async function getNewsletterSettings(): Promise<NewsletterSettings> {
  // Return cached settings if available
  if (settingsCache) {
    logger.debug('Returning cached newsletter settings');
    return settingsCache;
  }

  try {
    // Default newsletter settings
    const defaultSettings = getDefaultNewsletterSettings();
    
    // Get settings from database
    const dbSettings = await prisma.newsletter.findFirst();
    
    if (dbSettings) {
      const settings: NewsletterSettings = {
        headerLogo: dbSettings.headerLogo ?? defaultSettings.headerLogo,
        headerBanner: dbSettings.headerBanner ?? defaultSettings.headerBanner,
        footerText: dbSettings.footerText ?? defaultSettings.footerText,
        unsubscribeLink: dbSettings.unsubscribeLink ?? defaultSettings.unsubscribeLink,
        testEmailRecipients: dbSettings.testEmailRecipients ?? defaultSettings.testEmailRecipients,
        
        // Email sending configuration
        batchSize: dbSettings.batchSize ?? defaultSettings.batchSize,
        batchDelay: dbSettings.batchDelay ?? defaultSettings.batchDelay,
        fromEmail: dbSettings.fromEmail ?? defaultSettings.fromEmail,
        fromName: dbSettings.fromName ?? defaultSettings.fromName,
        replyToEmail: dbSettings.replyToEmail ?? defaultSettings.replyToEmail,
        subjectTemplate: dbSettings.subjectTemplate ?? defaultSettings.subjectTemplate,
        emailSalt: dbSettings.emailSalt || undefined,

        // Newsletter sending performance settings
        chunkSize: dbSettings.chunkSize ?? defaultSettings.chunkSize,
        chunkDelay: dbSettings.chunkDelay ?? defaultSettings.chunkDelay,
        emailTimeout: dbSettings.emailTimeout ?? defaultSettings.emailTimeout,

        // SMTP connection settings
        connectionTimeout: dbSettings.connectionTimeout ?? defaultSettings.connectionTimeout,
        greetingTimeout: dbSettings.greetingTimeout ?? defaultSettings.greetingTimeout,
        socketTimeout: dbSettings.socketTimeout ?? defaultSettings.socketTimeout,
        maxConnections: dbSettings.maxConnections ?? defaultSettings.maxConnections,
        maxMessages: dbSettings.maxMessages ?? defaultSettings.maxMessages,

        // Retry logic settings
        maxRetries: dbSettings.maxRetries ?? defaultSettings.maxRetries,
        maxBackoffDelay: dbSettings.maxBackoffDelay ?? defaultSettings.maxBackoffDelay,
        retryChunkSizes: dbSettings.retryChunkSizes ?? defaultSettings.retryChunkSizes,
        
        // System fields
        id: dbSettings.id,
        createdAt: dbSettings.createdAt,
        updatedAt: dbSettings.updatedAt
      };
      
      // Cache the settings
      settingsCache = settings;
      logger.info('Newsletter settings loaded and cached from database');
      
      return settings;
    } else {
      // Try to create default settings
      try {
        const newSettings = await prisma.newsletter.create({
          data: defaultSettings
        });
        
        // Cache the newly created settings
        settingsCache = newSettings as NewsletterSettings;
        logger.info('Newsletter settings created and cached');
        
        return settingsCache;
      } catch (createError) {
        logger.warn('Could not create newsletter settings', {
          module: 'newsletter-service',
          context: { 
            operation: 'getNewsletterSettings',
            error: (createError as Error).message 
          }
        });
        // Cache and return defaults if creation fails
        settingsCache = defaultSettings;
        return settingsCache;
      }
    }
  } catch (error) {
    logger.error(error as Error, {
      module: 'newsletter-service',
      context: { operation: 'getNewsletterSettings' }
    });
    // Cache and return defaults on error
    const defaultSettings = getDefaultNewsletterSettings();
    settingsCache = defaultSettings;
    return defaultSettings;
  }
}

/**
 * Updates newsletter settings in the database
 */
export async function updateNewsletterSettings(data: Partial<NewsletterSettings>): Promise<NewsletterSettings> {
  try {
    // Validate data
    if (!data) {
      throw new Error('Newsletter settings data is required');
    }
    
    // Get existing newsletter settings
    const newsletterSettings = await prisma.newsletter.findFirst();
    
    let updatedSettings;
    
    if (newsletterSettings) {
      // Update existing settings
      updatedSettings = await prisma.newsletter.update({
        where: { id: newsletterSettings.id },
        data: {
          // Display settings
          headerLogo: data.headerLogo,
          headerBanner: data.headerBanner,
          footerText: data.footerText,
          unsubscribeLink: data.unsubscribeLink,
          testEmailRecipients: data.testEmailRecipients,
          
          // Email sending configuration
          batchSize: data.batchSize,
          batchDelay: data.batchDelay,
          fromEmail: data.fromEmail,
          fromName: data.fromName,
          replyToEmail: data.replyToEmail,
          subjectTemplate: data.subjectTemplate,
          emailSalt: data.emailSalt,

          // Newsletter sending performance settings
          chunkSize: data.chunkSize,
          chunkDelay: data.chunkDelay,
          emailTimeout: data.emailTimeout,

          // SMTP connection settings
          connectionTimeout: data.connectionTimeout,
          greetingTimeout: data.greetingTimeout,
          socketTimeout: data.socketTimeout,
          maxConnections: data.maxConnections,
          maxMessages: data.maxMessages,

          // Retry logic settings
          maxRetries: data.maxRetries,
          maxBackoffDelay: data.maxBackoffDelay,
          retryChunkSizes: data.retryChunkSizes
        }
      });
    } else {
      // Create new settings with defaults for missing fields
      const defaultSettings = getDefaultNewsletterSettings();
      updatedSettings = await prisma.newsletter.create({
        data: {
          // Display settings
          headerLogo: data.headerLogo || defaultSettings.headerLogo,
          headerBanner: data.headerBanner || defaultSettings.headerBanner,
          footerText: data.footerText || defaultSettings.footerText,
          unsubscribeLink: data.unsubscribeLink || defaultSettings.unsubscribeLink,
          testEmailRecipients: data.testEmailRecipients || defaultSettings.testEmailRecipients,
          
          // Email sending configuration
          batchSize: data.batchSize || defaultSettings.batchSize,
          batchDelay: data.batchDelay || defaultSettings.batchDelay,
          fromEmail: data.fromEmail || defaultSettings.fromEmail,
          fromName: data.fromName || defaultSettings.fromName,
          replyToEmail: data.replyToEmail || defaultSettings.replyToEmail,
          subjectTemplate: data.subjectTemplate || defaultSettings.subjectTemplate,

          // Newsletter sending performance settings
          chunkSize: data.chunkSize || defaultSettings.chunkSize,
          chunkDelay: data.chunkDelay || defaultSettings.chunkDelay,
          emailTimeout: data.emailTimeout || defaultSettings.emailTimeout,

          // SMTP connection settings
          connectionTimeout: data.connectionTimeout || defaultSettings.connectionTimeout,
          greetingTimeout: data.greetingTimeout || defaultSettings.greetingTimeout,
          socketTimeout: data.socketTimeout || defaultSettings.socketTimeout,
          maxConnections: data.maxConnections || defaultSettings.maxConnections,
          maxMessages: data.maxMessages || defaultSettings.maxMessages,

          // Retry logic settings
          maxRetries: data.maxRetries || defaultSettings.maxRetries,
          maxBackoffDelay: data.maxBackoffDelay || defaultSettings.maxBackoffDelay,
          retryChunkSizes: data.retryChunkSizes || defaultSettings.retryChunkSizes
        }
      });
    }
    
    // Invalidate cache immediately after update
    settingsCache = null;
    logger.info('Newsletter settings updated, cache invalidated');
    
    return updatedSettings as NewsletterSettings;
  } catch (error) {
    logger.error(error as Error, {
      module: 'newsletter-service',
      context: { operation: 'updateNewsletterSettings' }
    });
    throw handleDatabaseError(error, 'updateNewsletterSettings');
  }
}

/**
 * Fetches appointments for the newsletter
 * Returns only accepted appointments with future dates
 */
export async function fetchNewsletterAppointments(): Promise<{
  featuredAppointments: Appointment[];
  upcomingAppointments: Appointment[];
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    // Get featured appointments
    const featuredAppointments = await prisma.appointment.findMany({
      where: {
        featured: true,
        status: 'accepted',
        startDateTime: {
          gte: today // Only appointments from today onwards
        }
      },
      orderBy: {
        startDateTime: 'asc'
      }
    });
    
    // Get upcoming appointments (not featured)
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        featured: false,
        status: 'accepted',
        startDateTime: {
          gte: today // Only appointments from today onwards
        }
      },
      orderBy: {
        startDateTime: 'asc'
      }
    });
    
    return { featuredAppointments, upcomingAppointments };
  } catch (error) {
    console.error('Error fetching newsletter appointments:', error);
    throw error;
  }
}

/**
 * Fetches status reports from the last 2 weeks for the newsletter
 * Returns status reports with their associated groups
 */
export async function fetchNewsletterStatusReports(): Promise<{
  statusReportsByGroup: {
    group: Group,
    reports: StatusReport[]
  }[];
}> {
  try {
    // Get the date 2 weeks ago
    const twoWeeksAgo = subWeeks(new Date(), 2);
    
    // Get all active groups
    const groups = await prisma.group.findMany({
      where: {
        status: 'ACTIVE'
      },
      orderBy: {
        name: 'asc' // Sort groups alphabetically
      },
      include: {
        statusReports: {
          where: {
            status: 'ACTIVE',
            createdAt: {
              gte: twoWeeksAgo // Only reports from the last 2 weeks
            }
          },
          orderBy: {
            createdAt: 'desc' // Latest reports first
          }
        }
      }
    });
    
    // Filter out groups with no reports
    const statusReportsByGroup = groups
      .filter(group => group.statusReports.length > 0)
      .map(group => ({
        group: {
          id: group.id,
          name: group.name,
          slug: group.slug,
          description: group.description,
          logoUrl: group.logoUrl,
          metadata: group.metadata,
          status: group.status,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt
        },
        reports: group.statusReports
      }));
    
    return { statusReportsByGroup };
  } catch (error) {
    console.error('Error fetching newsletter status reports:', error);
    throw error;
  }
}

/**
 * Generates newsletter HTML based on settings, appointments, and status reports
 */
export async function generateNewsletter(introductionText: string): Promise<string> {
  try {
    // Get newsletter settings
    const newsletterSettings = await getNewsletterSettings();
    
    // Get appointments
    const { featuredAppointments, upcomingAppointments } = await fetchNewsletterAppointments();
    
    // Get status reports
    const { statusReportsByGroup } = await fetchNewsletterStatusReports();
    
    const baseUrl = getBaseUrl();
    console.log('Generated baseUrl for newsletter:', baseUrl);
    
    // Generate HTML email
    return generateNewsletterHtml({
      newsletterSettings,
      introductionText,
      featuredAppointments,
      upcomingAppointments,
      statusReportsByGroup,
      baseUrl
    });
  } catch (error) {
    console.error('Error generating newsletter:', error);
    throw error;
  }
}

/**
 * Sends a test newsletter email
 */
export async function sendNewsletterTestEmail(html: string): Promise<{
  success: boolean;
  messageId?: string;
  error?: Error | unknown;
  recipientCount: number;
}> {
  try {
    // Get the test email recipients from the database
    const newsletterSettings = await getNewsletterSettings();
    const testRecipients = newsletterSettings?.testEmailRecipients || undefined;
    
    // Send the test email
    return await sendTestEmail({ 
      html, 
      testRecipients 
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    throw error;
  }
}

/**
 * API handler for getting newsletter settings
 */
export async function handleGetNewsletterSettings(): Promise<NextResponse> {
  try {
    const settings = await getNewsletterSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching newsletter settings:', error);
    return serverErrorResponse('Failed to fetch newsletter settings');
  }
}

/**
 * API handler for updating newsletter settings
 */
export async function handleUpdateNewsletterSettings(request: NextRequest): Promise<NextResponse> {
  try {
    const data = await request.json();
    const updatedSettings = await updateNewsletterSettings(data);
    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('Error updating newsletter settings:', error);
    return serverErrorResponse('Failed to update newsletter settings');
  }
}

/**
 * API handler for generating newsletter HTML
 */
export async function handleGenerateNewsletter(request: NextRequest): Promise<NextResponse> {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const introductionText = url.searchParams.get('introductionText') || 
      '<p>Herzlich willkommen zum Newsletter der Linken Frankfurt!</p>';
    
    // Generate the HTML
    const html = await generateNewsletter(introductionText);
    
    // Return the generated HTML
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating newsletter:', error);
    return serverErrorResponse('Failed to generate newsletter');
  }
}

/**
 * API handler for sending a test newsletter
 */
export async function handleSendTestNewsletter(request: NextRequest): Promise<NextResponse> {
  try {
    const { html, newsletterId } = await request.json();
    
    let newsletterHtml = html;
    
    // If newsletterId is provided, fetch the newsletter content
    if (newsletterId && !html) {
      const newsletter = await prisma.newsletterItem.findUnique({
        where: { id: newsletterId }
      });
      
      if (!newsletter) {
        return NextResponse.json(
          { error: 'Newsletter not found' },
          { status: 404 }
        );
      }
      
      newsletterHtml = fixUrlsInNewsletterHtml(newsletter.content || '');
    } else if (html) {
      // Fix URLs in the provided HTML as well
      newsletterHtml = fixUrlsInNewsletterHtml(html);
    }
    
    if (!newsletterHtml) {
      return NextResponse.json(
        { error: 'Newsletter HTML content is required' },
        { status: 400 }
      );
    }
    
    const result = await sendNewsletterTestEmail(newsletterHtml);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test emails sent successfully to ${result.recipientCount} recipient${result.recipientCount !== 1 ? 's' : ''}`,
        messageId: result.messageId,
        recipientCount: result.recipientCount
      });
    } else {
      console.error('Failed to send test email:', result.error);
      return NextResponse.json(
        { 
          error: 'Failed to send test email', 
          details: result.error instanceof Error ? result.error.message : 'Unknown error',
          recipientCount: result.recipientCount
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return serverErrorResponse('Failed to send test email');
  }
}

/**
 * Interface for saving draft newsletter parameters
 */
export interface SaveDraftNewsletterParams {
  subject: string;
  introductionText: string;
  content?: string;
  settings?: Record<string, unknown>;
}

/**
 * Interface for updating draft newsletter parameters
 */
export interface UpdateDraftNewsletterParams extends Partial<SaveDraftNewsletterParams> {
  id: string;
}

/**
 * Interface for listing draft newsletters parameters
 */
export interface ListDraftNewslettersParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Saves a draft newsletter
 * @param params Newsletter draft parameters
 * @returns Promise resolving to the created newsletter
 */
export async function saveDraftNewsletter(params: SaveDraftNewsletterParams): Promise<NewsletterItem> {
  try {
    const { subject, introductionText, content, settings } = params;

    // Validate required fields
    if (!subject || !introductionText) {
      const details: Record<string, string> = {};
      if (!subject) details.subject = 'Subject is required';
      if (!introductionText) details.introductionText = 'Introduction text is required';
      
      throw new NewsletterValidationError('Subject and introduction text are required', details);
    }

    // Ensure settings is serialized as JSON string if provided
    const settingsJson = settings 
      ? (typeof settings === 'string' ? settings : JSON.stringify(settings))
      : null;

    // Create the draft newsletter
    const newsletter = await prisma.newsletterItem.create({
      data: {
        subject,
        introductionText,
        content: content || null,
        status: 'draft',
        settings: settingsJson,
        recipientCount: null,
        sentAt: null
      }
    });

    logger.info('Draft newsletter saved successfully', {
      context: {
        id: newsletter.id,
        subject
      }
    });

    return newsletter;
  } catch (error) {
    if (error instanceof NewsletterValidationError) {
      throw error;
    }
    throw handleDatabaseError(error, 'saveDraftNewsletter');
  }
}

/**
 * Updates a draft newsletter
 * @param params Update parameters including newsletter ID
 * @returns Promise resolving to the updated newsletter
 */
export async function updateDraftNewsletter(params: UpdateDraftNewsletterParams): Promise<NewsletterItem> {
  try {
    const { id, subject, introductionText, content, settings } = params;

    // Check if newsletter exists and is a draft
    const existingNewsletter = await prisma.newsletterItem.findUnique({
      where: { id }
    });

    if (!existingNewsletter) {
      throw new NewsletterNotFoundError('Newsletter not found', { id });
    }

    if (existingNewsletter.status !== 'draft') {
      throw new NewsletterValidationError('Only draft newsletters can be updated', {
        status: existingNewsletter.status
      });
    }

    // Prepare update data
    const updateData: Partial<NewsletterItem> = {};
    if (subject !== undefined) updateData.subject = subject;
    if (introductionText !== undefined) updateData.introductionText = introductionText;
    if (content !== undefined) updateData.content = content;
    if (settings !== undefined) {
      updateData.settings = typeof settings === 'string' 
        ? settings 
        : JSON.stringify(settings);
    }

    // Update the newsletter
    const updatedNewsletter = await prisma.newsletterItem.update({
      where: { id },
      data: updateData
    });

    logger.info('Draft newsletter updated successfully', {
      context: {
        id: updatedNewsletter.id,
        subject: updatedNewsletter.subject
      }
    });

    return updatedNewsletter;
  } catch (error) {
    if (error instanceof NewsletterNotFoundError || error instanceof NewsletterValidationError) {
      throw error;
    }
    throw handleDatabaseError(error, 'updateDraftNewsletter');
  }
}

/**
 * Retrieves a newsletter by ID (draft or sent)
 * @param id Newsletter ID
 * @returns Promise resolving to the newsletter or null if not found
 */
export async function getNewsletter(id: string): Promise<NewsletterItem | null> {
  try {
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id }
    });

    return newsletter;
  } catch (error) {
    throw handleDatabaseError(error, 'getNewsletter');
  }
}

/**
 * Lists draft newsletters with pagination and search
 * @param params Pagination and search parameters
 * @returns Promise resolving to paginated result
 */
export async function listDraftNewsletters(params: ListDraftNewslettersParams = {}): Promise<PaginatedResult<NewsletterItem>> {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '' 
    } = params;

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.min(50, Math.max(1, limit)); // Limit between 1 and 50
    const skip = (validPage - 1) * validLimit;

    // Build filter conditions
    const where = {
      status: 'draft',
      ...(search ? {
        OR: [
          {
            subject: {
              contains: search,
              mode: 'insensitive' as const
            }
          },
          {
            introductionText: {
              contains: search,
              mode: 'insensitive' as const
            }
          }
        ]
      } : {})
    };

    // Fetch records and total count in parallel
    const [newsletters, total] = await Promise.all([
      prisma.newsletterItem.findMany({
        where,
        orderBy: {
          updatedAt: 'desc'
        },
        skip,
        take: validLimit
      }),
      prisma.newsletterItem.count({ where })
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(total / validLimit);

    return {
      items: newsletters,
      total,
      page: validPage,
      limit: validLimit,
      totalPages
    };
  } catch (error) {
    throw handleDatabaseError(error, 'listDraftNewsletters');
  }
}

/**
 * Deletes a draft newsletter
 * @param id Newsletter ID
 * @returns Promise resolving to the deleted newsletter
 */
export async function deleteDraftNewsletter(id: string): Promise<NewsletterItem> {
  try {
    // Check if newsletter exists and is a draft
    const existingNewsletter = await prisma.newsletterItem.findUnique({
      where: { id }
    });

    if (!existingNewsletter) {
      throw new NewsletterNotFoundError('Newsletter not found', { id });
    }

    if (existingNewsletter.status !== 'draft') {
      throw new NewsletterValidationError('Only draft newsletters can be deleted', {
        status: existingNewsletter.status
      });
    }

    // Delete the newsletter
    const deletedNewsletter = await prisma.newsletterItem.delete({
      where: { id }
    });

    logger.info('Draft newsletter deleted successfully', {
      context: {
        id: deletedNewsletter.id,
        subject: deletedNewsletter.subject
      }
    });

    return deletedNewsletter;
  } catch (error) {
    if (error instanceof NewsletterNotFoundError || error instanceof NewsletterValidationError) {
      throw error;
    }
    throw handleDatabaseError(error, 'deleteDraftNewsletter');
  }
}

/**
 * Retrieves a newsletter by ID with proper error handling
 * @param id Newsletter ID
 * @returns Promise resolving to the newsletter
 * @throws NewsletterNotFoundError if newsletter doesn't exist
 */
export async function getNewsletterById(id: string): Promise<NewsletterItem> {
  try {
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id }
    });

    if (!newsletter) {
      throw new NewsletterNotFoundError(`Newsletter with ID ${id} not found`, { id });
    }

    logger.debug('Newsletter retrieved by ID', {
      context: {
        id: newsletter.id,
        subject: newsletter.subject,
        status: newsletter.status
      }
    });

    return newsletter;
  } catch (error) {
    if (error instanceof NewsletterNotFoundError) {
      throw error;
    }
    throw handleDatabaseError(error, 'getNewsletterById');
  }
}

/**
 * Lists newsletters with pagination and optional status filter
 * @param params Pagination and filter parameters
 * @returns Promise resolving to paginated result
 */
export async function listNewsletters(params: {
  page?: number;
  limit?: number;
  status?: string;
} = {}): Promise<PaginatedResult<NewsletterItem>> {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status
    } = params;

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.min(50, Math.max(1, limit)); // Limit between 1 and 50
    const skip = (validPage - 1) * validLimit;

    // Build filter conditions
    const where = status 
      ? { status }
      : {};

    // Get total count
    const total = await prisma.newsletterItem.count({
      where
    });

    // Get newsletters
    const newsletters = await prisma.newsletterItem.findMany({
      where,
      skip,
      take: validLimit,
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    const totalPages = Math.ceil(total / validLimit);

    logger.debug('Newsletters listed successfully', {
      context: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages,
        status
      }
    });

    return {
      items: newsletters,
      total,
      page: validPage,
      limit: validLimit,
      totalPages
    };
  } catch (error) {
    throw handleDatabaseError(error, 'listNewsletters');
  }
}

/**
 * Creates a new newsletter
 * @param data Newsletter data with subject and optional introduction
 * @returns Promise resolving to the created newsletter
 */
export async function createNewsletter(data: { 
  subject: string; 
  introduction?: string;
}): Promise<NewsletterItem> {
  try {
    const { subject, introduction } = data;

    // Validate required fields
    if (!subject || subject.trim().length === 0) {
      throw new NewsletterValidationError('Newsletter subject is required', {
        subject: 'Subject is required and cannot be empty'
      });
    }

    // Validate subject length
    if (subject.length > 200) {
      throw new NewsletterValidationError('Newsletter subject is too long', {
        subject: 'Subject must be 200 characters or less'
      });
    }

    // Create the newsletter with draft status
    const newsletter = await prisma.newsletterItem.create({
      data: {
        subject: subject.trim(),
        introductionText: introduction || '',
        content: null,
        status: 'draft',
        settings: null,
        recipientCount: null,
        sentAt: null
      }
    });

    logger.info('Newsletter created successfully', {
      module: 'newsletter-service',
      context: {
        id: newsletter.id,
        subject: newsletter.subject,
        operation: 'createNewsletter'
      }
    });

    return newsletter;
  } catch (error) {
    if (error instanceof NewsletterValidationError) {
      throw error;
    }
    throw handleDatabaseError(error, 'createNewsletter');
  }
}

/**
 * Updates an existing newsletter
 * @param id Newsletter ID
 * @param data Partial newsletter data to update
 * @returns Promise resolving to the updated newsletter
 */
export async function updateNewsletter(
  id: string, 
  data: Partial<NewsletterItem>
): Promise<NewsletterItem> {
  try {
    // Validate newsletter ID
    if (!id || id.trim().length === 0) {
      throw new NewsletterValidationError('Newsletter ID is required');
    }

    // Check if newsletter exists
    const existingNewsletter = await prisma.newsletterItem.findUnique({
      where: { id }
    });

    if (!existingNewsletter) {
      throw new NewsletterNotFoundError(`Newsletter with ID ${id} not found`, { id });
    }

    // Prevent updating sent newsletters
    if (existingNewsletter.status === 'sent') {
      throw new NewsletterValidationError('Cannot update a sent newsletter', {
        status: 'Newsletter has already been sent and cannot be modified'
      });
    }

    // Validate subject if provided
    if (data.subject !== undefined) {
      if (!data.subject || data.subject.trim().length === 0) {
        throw new NewsletterValidationError('Newsletter subject cannot be empty', {
          subject: 'Subject is required and cannot be empty'
        });
      }
      if (data.subject.length > 200) {
        throw new NewsletterValidationError('Newsletter subject is too long', {
          subject: 'Subject must be 200 characters or less'
        });
      }
    }

    // Prepare update data - only include allowed fields
    const updateData: Partial<{
      subject: string;
      introductionText: string;
      content: string | null;
      settings: string | null;
      status: string;
    }> = {};
    
    if (data.subject !== undefined) updateData.subject = data.subject.trim();
    if (data.introductionText !== undefined) updateData.introductionText = data.introductionText;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.settings !== undefined) {
      updateData.settings = typeof data.settings === 'string' 
        ? data.settings 
        : JSON.stringify(data.settings);
    }
    if (data.status !== undefined && ['draft', 'sending', 'sent'].includes(data.status)) {
      updateData.status = data.status;
    }

    // Update the newsletter
    const updatedNewsletter = await prisma.newsletterItem.update({
      where: { id },
      data: updateData
    });

    logger.info('Newsletter updated successfully', {
      module: 'newsletter-service',
      context: {
        id: updatedNewsletter.id,
        subject: updatedNewsletter.subject,
        operation: 'updateNewsletter',
        updatedFields: Object.keys(updateData)
      }
    });

    return updatedNewsletter;
  } catch (error) {
    if (error instanceof NewsletterNotFoundError || error instanceof NewsletterValidationError) {
      throw error;
    }
    throw handleDatabaseError(error, 'updateNewsletter');
  }
}

/**
 * Deletes a newsletter
 * @param id Newsletter ID
 * @returns Promise resolving to the deleted newsletter
 */
export async function deleteNewsletter(id: string): Promise<NewsletterItem> {
  try {
    // Validate newsletter ID
    if (!id || id.trim().length === 0) {
      throw new NewsletterValidationError('Newsletter ID is required');
    }

    // Check if newsletter exists
    const existingNewsletter = await prisma.newsletterItem.findUnique({
      where: { id }
    });

    if (!existingNewsletter) {
      throw new NewsletterNotFoundError(`Newsletter with ID ${id} not found`, { id });
    }

    // Only allow deletion of draft newsletters
    if (existingNewsletter.status !== 'draft') {
      throw new NewsletterValidationError('Only draft newsletters can be deleted', {
        status: `Cannot delete newsletter with status: ${existingNewsletter.status}`
      });
    }

    // Delete the newsletter
    const deletedNewsletter = await prisma.newsletterItem.delete({
      where: { id }
    });

    logger.info('Newsletter deleted successfully', {
      module: 'newsletter-service',
      context: {
        id: deletedNewsletter.id,
        subject: deletedNewsletter.subject,
        operation: 'deleteNewsletter'
      }
    });

    return deletedNewsletter;
  } catch (error) {
    if (error instanceof NewsletterNotFoundError || error instanceof NewsletterValidationError) {
      throw error;
    }
    throw handleDatabaseError(error, 'deleteNewsletter');
  }
}