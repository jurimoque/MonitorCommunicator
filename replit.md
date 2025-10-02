# Stage Monitor Control System

## Overview

This is a real-time stage monitor control application that allows musicians to communicate with sound technicians during live performances. Musicians can request audio adjustments (volume, reverb) for their instruments, send thanks confirmations, and request emergency assistance through a WebSocket-based system. The application features separate interfaces for musicians and technicians, with a PostgreSQL database for persistence, bilingual support (English/Spanish), custom instrument creation shared across all users, and a modern React frontend with Express backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Updates (October 2025)

### UI/UX Improvements
- **Pastel Rainbow Gradient Design**: Updated theme with harmonious pastel colors (purple-pink-blue gradients)
- **Light Typography**: Changed to font-light for a more elegant appearance throughout the app
- **Consistent Button Sizing**: Unified text sizes across all volume and reverb buttons (text-xl)
- **Dark Mode Support**: Persistent dark mode toggle with localStorage

### New Features
- **Bilingual Support**: Full English/Spanish language toggle with localStorage persistence
- **Thanks Button**: Green confirmation button for musicians to thank technicians
- **Emergency Assistance Button**: Red button for musicians to request urgent help
- **Custom Instruments**: Room-shared custom instruments via database with real-time WebSocket propagation
- **Reversed Notification Order**: Technician panel shows newest requests at the top (no scrolling needed)

### Technical Implementation
- **i18n System**: Translation hook with localStorage for language persistence
- **Custom Instruments Table**: PostgreSQL table for storing room-specific instruments
- **Enhanced WebSocket Messages**: Support for 'thanks' and 'assistance' action types

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/UI components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: Native WebSocket API with custom React hooks for connection management

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Real-time Features**: WebSocket Server (ws library) for bi-directional communication
- **API Design**: RESTful endpoints for room creation and request management, WebSocket for real-time features
- **Development Setup**: Vite middleware integration for hot module replacement in development

### Database Layer
- **ORM**: Drizzle ORM with Neon serverless PostgreSQL
- **Schema**: Two main entities - rooms (performance spaces) and requests (musician audio requests)
- **Validation**: Drizzle-Zod integration for runtime type safety and validation
- **Migrations**: Drizzle Kit for database schema management

### Authentication & Authorization
- **Current State**: No authentication system implemented
- **Access Control**: Room-based access using URL parameters (roomId)
- **Security**: Basic input validation and sanitization

### Real-time Communication Design
- **Protocol**: WebSocket connections with JSON message format
- **Room Management**: Clients join rooms by roomId parameter
- **Message Types**: Request submission, request completion notifications, connection status
- **Reconnection**: Automatic reconnection logic with exponential backoff
- **Error Handling**: Connection state management and user feedback

### Key Design Patterns
- **Component Composition**: Modular UI components with clear separation of concerns
- **Custom Hooks**: Reusable WebSocket connection logic and state management
- **Type Safety**: Full TypeScript coverage with Zod schemas for runtime validation
- **Responsive Design**: Mobile-first approach with Tailwind responsive utilities
- **Progressive Enhancement**: Graceful degradation when WebSocket connections fail

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Hook Form with resolvers
- **Build Tools**: Vite with React plugin, TypeScript compiler, ESBuild for production builds
- **Development Tools**: TSX for TypeScript execution, Replit-specific Vite plugins

### UI and Styling Dependencies
- **Component Library**: Complete Radix UI suite (30+ components including Dialog, Select, Toast, etc.)
- **Styling**: Tailwind CSS with PostCSS, Autoprefixer, Class Variance Authority for component variants
- **Icons**: Lucide React icon library
- **Utilities**: CLSX and Tailwind Merge for conditional styling

### Backend Dependencies
- **Server Framework**: Express.js with HTTP server creation
- **WebSocket**: WS library for WebSocket server implementation
- **Database**: Drizzle ORM with Neon serverless PostgreSQL connector
- **Validation**: Zod schema validation library
- **Development**: Drizzle Kit for database operations

### Database Configuration
- **Provider**: Neon serverless PostgreSQL (configured but database needs provisioning)
- **Connection**: Environment variable-based connection string (DATABASE_URL)
- **Schema Location**: `/db/schema.ts` with table definitions and Zod validators
- **Migration Directory**: `/migrations` (generated by Drizzle Kit)

### Environment Requirements
- **DATABASE_URL**: PostgreSQL connection string (required for database operations)
- **Node.js**: ES modules support with TypeScript compilation
- **Development Server**: Vite dev server with Express middleware integration