# Simpiller Dashboard

A modern healthcare medication management dashboard built with Next.js, TypeScript, and Tailwind CSS.

## Overview

Simpiller is a medication management system that helps healthcare facilities manage patient medication schedules, send alerts, and track compliance. This dashboard provides providers and administrators with a comprehensive view of their patients and medication management operations.

## Features

### Current Features
- **Modern Dashboard**: Clean, responsive design with real-time statistics
- **Patient Management**: View and manage patient roster with compliance tracking
- **Navigation**: Intuitive sidebar navigation for different sections
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Component Library**: Reusable UI components for consistent design

### Planned Features
- **Authentication**: Supabase integration for user authentication
- **Real-time Data**: Live updates for medication alerts and patient activity
- **Analytics**: Detailed compliance and medication analytics
- **Medication Management**: Add, edit, and schedule medications
- **Alert System**: Configure and manage medication alerts
- **Facility Management**: Multi-facility support for administrators
- **Mobile App**: React Native mobile application for patients

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **UI Components**: Custom component library
- **Database**: Supabase (planned)
- **Authentication**: Supabase Auth (planned)

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Dashboard home page
│   ├── patients/          # Patient management pages
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   │   ├── button.tsx
│   │   └── card.tsx
│   ├── layout/           # Layout components
│   │   ├── sidebar.tsx
│   │   └── header.tsx
│   └── dashboard/        # Dashboard-specific components
│       └── stats-card.tsx
└── lib/                  # Utility functions
    └── utils.ts
```

## Getting Started

### Prerequisites
- Node.js 18+ (recommended)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd simpiller_site
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Pages

1. Create a new directory in `src/app/` for your route
2. Add a `page.tsx` file with your component
3. Import and use the layout components (Sidebar, Header) for consistency

### Component Guidelines

- Use TypeScript interfaces for all props
- Follow the existing component patterns
- Use Tailwind CSS for styling
- Keep components focused and reusable

## Architecture Considerations

### Mobile App Strategy
The project is designed with future mobile app development in mind:
- Shared business logic between web and mobile
- Consistent design system
- TypeScript for type safety across platforms
- Component-based architecture for reusability

### Database Design (Planned)
- **Users**: Providers, administrators, patients
- **Facilities**: Multi-location support
- **Patients**: Patient information and medical history
- **Medications**: Medication details and schedules
- **Alerts**: Medication reminders and notifications
- **Compliance**: Patient medication adherence tracking

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for all new features
3. Test components across different screen sizes
4. Update documentation for new features

## License

[Add your license information here]
