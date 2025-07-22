import { render } from '@react-email/render';
import { EmailWrapper } from '../../../emails/components/EmailWrapper';
import { Header } from '../../../emails/components/Header';
import { Footer } from '../../../emails/components/Footer';
import { Button } from '../../../emails/components/Button';
import { Section } from '../../../emails/components/Section';

describe('Email Components', () => {
  describe('EmailWrapper', () => {
    it('should render with proper HTML structure', async () => {
      const html = await render(
        <EmailWrapper>
          <div>Test content</div>
        </EmailWrapper>
      );
      
      expect(html).toContain('<!DOCTYPE html');
      expect(html).toContain('<html lang="de">');
      expect(html).toContain('<meta charset="UTF-8"');
      expect(html).toContain('Die Linke Frankfurt Newsletter');
      expect(html).toContain('Test content');
    });

    it('should include email client compatibility styles', async () => {
      const html = await render(
        <EmailWrapper>
          <div>Content</div>
        </EmailWrapper>
      );
      
      // Check for email client compatibility
      expect(html).toContain('font-family: "Open Sans"');
      expect(html).toContain('max-width: 700px');
      expect(html).toContain('-webkit-text-size-adjust');
      expect(html).toContain('-ms-text-size-adjust');
    });
  });

  describe('Header', () => {
    it('should render banner and logo correctly', async () => {
      const props = {
        logo: 'https://example.com/logo.png',
        banner: 'https://example.com/banner.jpg'
      };
      
      const html = await render(<Header {...props} />);
      
      expect(html).toContain('src="https://example.com/banner.jpg"');
      expect(html).toContain('alt="Die Linke Frankfurt Banner"');
      expect(html).toContain('src="https://example.com/logo.png"');
      expect(html).toContain('alt="Die Linke Frankfurt Logo"');
    });

    it('should have proper positioning for logo overlay', async () => {
      const props = {
        logo: 'https://example.com/logo.png',
        banner: 'https://example.com/banner.jpg'
      };
      
      const html = await render(<Header {...props} />);
      
      expect(html).toContain('position: absolute');
      expect(html).toContain('top: 20px');
      expect(html).toContain('left: 20px');
    });
  });

  describe('Footer', () => {
    it('should render footer text and unsubscribe link', async () => {
      const props = {
        text: 'Die Linke Frankfurt am Main',
        unsubscribeLink: 'https://example.com/unsubscribe'
      };
      
      const html = await render(<Footer {...props} />);
      
      expect(html).toContain('Die Linke Frankfurt am Main');
      expect(html).toContain('href="https://example.com/unsubscribe"');
      expect(html).toContain('Vom Newsletter abmelden');
    });

    it('should have proper footer styling', async () => {
      const props = {
        text: 'Test Footer',
        unsubscribeLink: '#'
      };
      
      const html = await render(<Footer {...props} />);
      
      expect(html).toContain('background-color: #222222');
      expect(html).toContain('color: #FFFFFF');
      expect(html).toContain('text-align: center');
    });
  });

  describe('Button', () => {
    it('should render basic button correctly', async () => {
      const html = await render(
        <Button href="https://example.com/link">
          Test Button
        </Button>
      );
      
      expect(html).toContain('href="https://example.com/link"');
      expect(html).toContain('Test Button');
      expect(html).toContain('background-color: #FF0000');
      expect(html).toContain('color: #FFFFFF');
    });

    it('should render button with container when requested', async () => {
      const html = await render(
        <Button href="https://example.com/link" withContainer>
          Container Button
        </Button>
      );
      
      expect(html).toContain('Container Button');
      expect(html).toContain('button-container');
      expect(html).toContain('margin-top: 15px');
    });

    it('should have proper button styling for email clients', async () => {
      const html = await render(
        <Button href="#test">Click Me</Button>
      );
      
      expect(html).toContain('display: inline-block');
      expect(html).toContain('padding: 10px 20px');
      expect(html).toContain('font-weight: bold');
      expect(html).toContain('text-decoration: none');
    });
  });

  describe('Section', () => {
    it('should render section with title', async () => {
      const html = await render(
        <Section title="Test Section">
          <div>Section content</div>
        </Section>
      );
      
      expect(html).toContain('Test Section');
      expect(html).toContain('Section content');
      expect(html).toContain('color: #FF0000');
      expect(html).toContain('font-size: 24px');
    });

    it('should render section without title', async () => {
      const html = await render(
        <Section>
          <div>Content only</div>
        </Section>
      );
      
      expect(html).toContain('Content only');
      expect(html).not.toContain('section-title');
    });

    it('should handle introduction section styling', async () => {
      const html = await render(
        <Section title="Introduction" isIntroduction>
          <div>Intro content</div>
        </Section>
      );
      
      expect(html).toContain('Introduction');
      expect(html).toContain('Intro content');
      expect(html).toContain('border-bottom: 1px solid #E5E5E5');
    });
  });
});