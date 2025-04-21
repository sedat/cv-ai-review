# CV AI Review

An AI-powered CV/Resume analyzer and optimizer built with Next.js and Google Gemini AI.

## Features

- **CV Upload & Analysis**: Upload your CV in PDF format for AI-powered analysis
- **Job Description Matching**: Compare your CV against specific job descriptions
- **Keyword Analysis**: Get detailed keyword match scores and missing keywords
- **Interactive PDF Editor**: Apply AI suggestions directly to your CV
- **Real-time Preview**: See changes in real-time with a side-by-side PDF viewer
- **Smart Suggestions**: Receive prioritized, actionable suggestions for improvement
- **ATS Optimization**: Ensure your CV is optimized for Applicant Tracking Systems

## Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **UI Components**: Shadcn UI
- **PDF Processing**: PDF.js, pdf-lib
- **AI Integration**: Google Gemini AI
- **Styling**: Tailwind CSS with dark mode support

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd cv-ai-review
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```bash
GEMINI_API_KEY=your_gemini_api_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Upload your CV in PDF format
2. Paste the job description you're targeting
3. Click "Analyze and Optimize CV"
4. Review the AI analysis including:
   - Keyword match score
   - Strengths and improvements
   - Section-specific suggestions
5. Use the PDF editor to apply suggested changes
6. Download your optimized CV