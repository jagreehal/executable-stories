import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ReportRoot } from '../context/ReportRoot';
import { kitchenSinkReport } from '../test/kitchen-sink';
import { ReportTocDrawer } from './ReportTocDrawer';

const meta: Meta<typeof ReportTocDrawer> = {
  title: 'Interactive/ReportTocDrawer',
  component: ReportTocDrawer,
};
export default meta;

type Story = StoryObj<typeof ReportTocDrawer>;

export const MobileContents: Story = {
  render: () => (
    <div className="toc-drawer-story">
      {/* Component tests use a desktop browser. Reveal the narrow-only trigger
          without changing production breakpoint behaviour. */}
      <style>{`.toc-drawer-story > button { display: flex !important; }`}</style>
      <ReportRoot report={kitchenSinkReport()}>
        <ReportTocDrawer />
      </ReportRoot>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Contents' }));

    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole('dialog', { name: 'Contents' });
    await expect(dialog).toBeVisible();
    const link = within(dialog).getByRole('link', {
      name: /caps the loyalty discount/i,
    });
    await expect(link).toHaveAttribute('href', '#checkout-discount');

    await userEvent.click(link);
    await expect(
      page.queryByRole('dialog', { name: 'Contents' }),
    ).not.toBeInTheDocument();
  },
};
