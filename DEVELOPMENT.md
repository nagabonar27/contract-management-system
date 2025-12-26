# Developer Guide

## Technology Stack
The application is built using a modern React-based stack:
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database & Auth**: Supabase
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI (Radix Primitives)
- **State Management**: TanStack Query (React Query)
- **Icons**: Lucide React

> **Note**: The legacy Flask backend has been fully removed. This is now a pure Next.js application.

## Prerequisites
- Node.js 18+
- npm or yarn
- A Supabase project (for database and authentication)

## Local Development Setup

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd <repository-directory>
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configure Environment Variables**
   Create a `.env.local` file in the root directory:
   \`\`\`env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   \`\`\`

4. **Run the development server**
   \`\`\`bash
   npm run dev
   \`\`\`
   Open directory [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

Key directories for maintainers:

- **`app/`**: Next.js App Router pages and layouts.
  - `(authenticated)/`: Routes that require user login (Dashboard, Contract Management).
  - `auth/`: Login and callback routes.

- **`components/`**: Reusable UI components.
  - **`contract/`**: Core business logic components (Reorganized).
    - `modals/`: Action dialogs (e.g., `CreateContractSheet`, `FinalizeContractModal`).
    - `nav/`: Navigation and headers (e.g., `ContractHeader`, `ContractNav`).
    - `sections/`: Large page blocks (e.g., `BidAgendaSection`, `GanttChart`).
    - `ui/`: Small, specific UI elements (e.g., `ContractBadges`).
    - `tables/`: Data tables for contract lists.

- **`lib/`**: Utilities and helper functions.
  - `contractUtils.ts`: Common business logic for contracts.
  - `supabase.ts`: Supabase client configuration.

## Deployment

The project is optimized for deployment on **Vercel**:
1. Push your code to a Git repository.
2. Import the project in Vercel.
3. Add the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, etc.) in the Vercel dashboard.
4. Deploy.
