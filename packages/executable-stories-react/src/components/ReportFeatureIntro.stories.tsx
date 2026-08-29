import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { featureFixture } from '../test/fixtures';
import { ReportFeatureIntro } from './ReportFeatureIntro';

const meta: Meta<typeof ReportFeatureIntro> = {
  title: 'Report/FeatureIntro',
  component: ReportFeatureIntro,
};
export default meta;

type Story = StoryObj<typeof ReportFeatureIntro>;

export const NarrativeAndGlossary: Story = {
  args: {
    feature: featureFixture({
      narrative:
        'Checkout protects **payment integrity** while keeping recovery clear.\n\n- Declines never create orders\n- Retriable failures preserve the basket',
      glossary: [
        { term: 'Decline', definition: 'A payment the issuer refuses.' },
        { term: 'Retry', definition: 'A new authorization attempt.' },
      ],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('payment integrity')).toBeVisible();
    await expect(canvas.getByRole('list')).toBeVisible();
    await expect(canvas.getByText('Decline')).toBeVisible();
    await expect(
      canvas.getByText('A new authorization attempt.'),
    ).toBeVisible();
  },
};

export const Empty: Story = {
  args: {
    feature: featureFixture({ narrative: undefined, glossary: undefined }),
  },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector('.es-report-island'),
    ).toBeEmptyDOMElement();
  },
};
