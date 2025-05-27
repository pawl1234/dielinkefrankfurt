import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSentNewsletter } from '@/lib/newsletter-archive';
import { Box, Container, Typography, Link } from '@mui/material';
import Image from 'next/image';

interface NewsletterPageParams {
  params: {
    id: string;
  };
}

/**
 * Generate metadata for the newsletter page
 */
export async function generateMetadata({ params }: NewsletterPageParams): Promise<Metadata> {
  const { id } = params;
  
  try {
    // Fetch newsletter to get the subject for metadata
    const newsletter = await getSentNewsletter(id);
    
    if (!newsletter) {
      return {
        title: 'Newsletter nicht gefunden',
        description: 'Der angeforderte Newsletter konnte nicht gefunden werden.'
      };
    }
    
    // Format date for the description
    const sentDate = new Date(newsletter.sentAt);
    const formattedDate = new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(sentDate);
    
    return {
      title: `${newsletter.subject} - Die Linke Frankfurt Newsletter`,
      description: `Newsletter von Die Linke Frankfurt vom ${formattedDate}. ${newsletter.recipientCount} Empfänger.`,
      openGraph: {
        title: newsletter.subject,
        description: `Newsletter von Die Linke Frankfurt vom ${formattedDate}`,
        type: 'article',
        publishedTime: newsletter.sentAt.toString(),
      }
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    
    // Fallback metadata
    return {
      title: 'Die Linke Frankfurt Newsletter',
      description: 'Newsletter-Archiv von Die Linke Frankfurt'
    };
  }
}

/**
 * Public newsletter page accessible via unique URL
 */
export default async function NewsletterPage({ params }: NewsletterPageParams) {
  const { id } = params;
  
  try {
    // Fetch newsletter
    const newsletter = await getSentNewsletter(id);
    
    if (!newsletter) {
      notFound();
    }
    
    // Extract the newsletter content
    const { content } = newsletter;
    
    // Format date
    const sentDate = new Date(newsletter.sentAt);
    const formattedDate = new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(sentDate);
    
    return (
      <>
        {/* Header with logo and basic info */}
        <Box 
          component="header" 
          sx={{ 
            py: 2, 
            px: 3, 
            bgcolor: '#f0f0f0', 
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Link href="https://die-linke-frankfurt.de" target="_blank" rel="noopener">
              <Image 
                src="/images/logo.png" 
                alt="Die Linke Frankfurt" 
                width={80} 
                height={80} 
                priority
              />
            </Link>
            <Box>
              <Typography variant="h6" component="h1">
                {newsletter.subject}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gesendet am {formattedDate}
              </Typography>
            </Box>
          </Box>
          
          <Link 
            href="https://die-linke-frankfurt.de" 
            target="_blank" 
            rel="noopener"
            sx={{ 
              textDecoration: 'none', 
              color: '#FF0000', 
              fontWeight: 'bold',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            Zur Webseite
          </Link>
        </Box>
        
        {/* Newsletter content */}
        <Container maxWidth="md" sx={{ my: 4 }}>
          {/* Render the HTML content using dangerouslySetInnerHTML */}
          <Box 
            sx={{ 
              '& img': { maxWidth: '100%', height: 'auto' },
              '& a': { color: '#FF0000' }
            }}
            dangerouslySetInnerHTML={{ __html: content }} 
          />
        </Container>
        
        {/* Footer */}
        <Box 
          component="footer" 
          sx={{ 
            py: 3, 
            px: 3, 
            mt: 4, 
            bgcolor: '#222222', 
            color: 'white',
            textAlign: 'center'
          }}
        >
          <Typography variant="body2" gutterBottom>
            © {new Date().getFullYear()} Die Linke Frankfurt am Main
          </Typography>
          <Typography variant="body2">
            <Link 
              href="https://die-linke-frankfurt.de/impressum" 
              sx={{ 
                color: 'white', 
                textDecoration: 'underline',
                mx: 1
              }}
              target="_blank"
              rel="noopener"
            >
              Impressum
            </Link>
            |
            <Link 
              href="https://die-linke-frankfurt.de/datenschutz" 
              sx={{ 
                color: 'white', 
                textDecoration: 'underline',
                mx: 1
              }}
              target="_blank"
              rel="noopener"
            >
              Datenschutz
            </Link>
          </Typography>
        </Box>
      </>
    );
  } catch (error) {
    console.error('Error fetching newsletter:', error);
    notFound();
  }
}