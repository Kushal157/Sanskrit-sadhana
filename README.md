# Sanskrit Sadhana (संस्कृत साधना)

Master the divine sounds of Sanskrit with AI-guided precision. Sanskrit Sadhana is an intelligent pronunciation evaluator that helps users perfect their recitation of ancient shlokas through advanced phonetic analysis.

## 🌟 Features

- **Phonetic Evaluation**: Real-time analysis of your pronunciation against standard Sanskrit phonetic rules.
- **Reference Audio**: High-quality archival audio for every shloka to guide your practice.
- **Custom Practice**: Type in English (IAST) and instantly manifest Devanagari script for any custom verse.
- **Detailed Insights**: Granular feedback on specific phonemes, showing exactly where your pronunciation differs from the reference.
- **Premium UI**: A glassmorphic, responsive design with Light/Dark mode transitions.
- **Session History**: Track your practice journey with a persistent login history.

## 🛠️ Technology Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Auth**: Custom Context-based Auth System with LocalStorage persistence.

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Logic**: Custom G2P (Grapheme-to-Phoneme) and Phonetic Alignment algorithms.
- **Platform**: Python 3.x

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.9+ ([Download](https://www.python.org/))
- **Git** (for version control)

### Quick Setup (Windows)

#### 1. Clone the Repository
```powershell
git clone https://github.com/yourusername/Sanskrit-Sadhana.git
cd Sanskrit-Sadhana
```

#### 2. Setup Python Virtual Environment
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

#### 3. Setup Backend
```powershell
cd Sanskrit-Sadhana-master\backend
pip install -r requirements.txt
```

#### 4. Setup Frontend (in a NEW terminal)
```powershell
cd Sanskrit-Sadhana-master\frontend
npm install
```

### Running the Project

You need **two terminal windows** to run both backend and frontend simultaneously.

#### Terminal 1 - Backend (FastAPI)
```powershell
# Make sure you're in the root directory with .venv activated
.\.venv\Scripts\Activate.ps1

cd Sanskrit-Sadhana-master\backend
python main.py
```
Backend will run on: **http://localhost:8000**

#### Terminal 2 - Frontend (Next.js)
```powershell
cd Sanskrit-Sadhana-master\frontend
npm run dev
```
Frontend will run on: **http://localhost:3000**

Open your browser and navigate to **http://localhost:3000** to use the application.

### Project Structure
```
Sanskrit-Sadhana-master/
├── backend/              # FastAPI server
│   ├── main.py          # Entry point
│   ├── g2p.py           # Grapheme-to-Phoneme conversion
│   ├── alignment.py      # Phonetic alignment logic
│   ├── scoring.py        # Pronunciation scoring
│   └── requirements.txt  # Python dependencies
├── frontend/            # Next.js application
│   ├── app/            # App router pages and components
│   ├── components/     # Reusable React components
│   ├── utils/          # Helper functions
│   ├── package.json    # Node dependencies
│   └── next.config.ts  # Next.js config
```

### Troubleshooting

**Issue**: Backend won't start
- Ensure `.venv` is activated (you should see `(.venv)` in your terminal)
- Run `pip install -r requirements.txt` again
- Check that port 8000 is not in use

**Issue**: Frontend won't start
- Run `npm install` again in the frontend directory
- Clear `.next` folder: `rmdir .next -Force -Recurse` (Windows)
- Check that port 3000 is not in use

**Issue**: Port already in use
- Backend: `netstat -ano | findstr :8000` (Windows) to find process using port 8000
- Frontend: `netstat -ano | findstr :3000` (Windows) to find process using port 3000

### Additional Commands

**Frontend Development**:
- `npm run dev` - Run development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

**Backend Debugging**:
- Run with `uvicorn main:app --reload` for auto-reload option

## 📖 How to Use
1. **Sign Up/Login**: Create a simple account to begin.
2. **Select a Verse**: Choose from the library of classic shlokas.
3. **Listen**: Press the "Reference" button to hear how the verse should sound.
4. **Record**: Click the Microphone icon and recite the verse.
5. **Analyze**: Let the AI evaluate your performance and provide detailed phonetic insights.

---
*Developed with devotion to the preserving the sounds of the ancient world.*

## Academic Write-Up (Draft)

### Abstract
Sanskrit Sadhana is an AI-assisted pronunciation learning platform designed to help users improve Sanskrit shloka recitation through structured, feedback-driven practice. Existing learning methods often rely on passive listening or generic correction, which makes precise pronunciation improvement difficult for beginners. The proposed system combines reference audio, grapheme-to-phoneme processing, and alignment-based scoring to provide detailed phonetic feedback at the segment level. By giving actionable correction points rather than only a final score, the platform supports iterative improvement and self-paced learning. The expected outcome is better pronunciation accuracy, improved learner confidence, and higher engagement in Sanskrit practice.

### Literature Survey
Research in computer-assisted language learning highlights that pronunciation improvement is most effective when learners receive immediate and specific feedback. Automatic speech evaluation systems in modern language learning often use phoneme-level comparison between user speech and a reference signal. In Indic language contexts, transliteration pipelines and grapheme-to-phoneme conversion are frequently used to bridge script input and pronunciation models. Alignment-based approaches are also common in speech processing because they can reveal where and how the learner's utterance deviates from the target sequence. Prior systems demonstrate that accuracy and learner outcomes improve when objective scoring is combined with understandable feedback. However, many tools remain either language-generic or weak in script-aware Sanskrit pronunciation workflows.

### Limitations of the Existing Works
1. Many available tools provide only overall pronunciation scores without fine-grained phonetic error localization.
2. Existing Sanskrit-focused solutions are limited in interactivity and often lack a guided correction loop.
3. Generic language apps are not optimized for Sanskrit phonology and script-specific pronunciation nuances.
4. Some systems do not support easy custom input with transliteration-to-Devanagari workflows.
5. Feedback is frequently delayed or not pedagogically actionable for consistent practice.

### Novelty of the Proposed Work
1. Integration of Sanskrit-specific grapheme-to-phoneme logic with alignment-driven pronunciation evaluation.
2. Segment-level, interpretable feedback showing exactly which phonetic units need correction.
3. Combined support for predefined shlokas and custom transliterated inputs.
4. A modern, learner-friendly interface that promotes repeated guided practice.
5. End-to-end flow from text selection to reference listening, recording, scoring, and revision.

### Problem Statement
Learners of Sanskrit often struggle to achieve accurate pronunciation because traditional resources do not provide immediate, precise, and personalized feedback on phonetic mistakes. There is a need for a practical digital system that evaluates recitation quality against a reliable reference and provides clear guidance to help users correct pronunciation errors effectively.

### Objectives
1. To build an AI-assisted Sanskrit pronunciation evaluation system for guided shloka practice.
2. To provide phoneme-level or segment-level diagnostic feedback instead of only aggregate scores.
3. To support both curated shloka content and custom transliterated user inputs.
4. To offer a responsive and accessible interface that encourages repeated learning sessions.
5. To improve learner pronunciation quality through iterative feedback and measurable scoring.

### Proposed Design
1. Input Layer: User selects a predefined shloka or enters custom text in transliteration.
2. Text Processing Layer: Transliteration is converted to Devanagari and transformed through grapheme-to-phoneme mapping.
3. Reference Layer: The system loads high-quality reference audio and phonetic targets for comparison.
4. Recording Layer: User recitation is captured and preprocessed for analysis.
5. Alignment and Scoring Layer: Learner audio is aligned with reference phonetic units to compute similarity and detect deviations.
6. Feedback Layer: The system returns detailed, actionable pronunciation insights for correction.
7. Progress Layer: Session outcomes are persisted to support learner tracking over time.
