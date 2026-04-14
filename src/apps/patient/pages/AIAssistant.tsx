import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Send, Mic, MicOff, Image, FileUp, Trash2, Bot, User, Loader2, Volume2,
  Languages, Sparkles, MessageSquareText, Square, Play, Plus, Pencil, Pin, Search,
  CheckCircle2, AlertCircle, RefreshCw, MoreHorizontal, X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useMedicalChat, type ChatMessage } from "@/hooks/useMedicalChat";
import { useLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useMedicalHistory, useMedicalHistoryFiles } from "@/shared/hooks/useHealthcare";
import { buildMedicalHistoryContext } from "@/shared/lib/medicalHistory";
import ReactMarkdown from "react-markdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MedicalReportTools } from "./MedicalReportTools";
import { medicalReportService } from "@/shared/services/healthcare";

// Dynamically import pdfjs-dist for compatibility with Vite/ESM
let pdfjsLib: any;
import Tesseract from "tesseract.js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Detect best supported MIME type for MediaRecorder */
function getRecorderMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

const RECOGNITION_LANGUAGE_MAP = {
  en: "en-US",
  tw: "ak-GH",
  ga: "gaa",
  ee: "ee-GH",
  ha: "ha-NG",
} as const;

const SPEECH_LANGUAGE_MAP = {
  en: "en-US",
  tw: "ak",
  ga: "en-GH",
  ee: "en-GH",
  ha: "ha",
} as const;

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC_MIME = "application/msword";

class UploadCancelledError extends Error {
  constructor() {
    super("Upload processing cancelled.");
    this.name = "UploadCancelledError";
  }
}

function isUploadCancelledError(error: unknown): error is UploadCancelledError {
  return error instanceof UploadCancelledError || (error instanceof Error && error.name === "UploadCancelledError");
}

const OCR_LANGUAGE_MAP: Record<LanguageCode, string> = {
  en: "eng",
  tw: "eng",
  ga: "eng",
  ee: "eng",
  ha: "hau",
};

type VoiceStyle = "natural" | "balanced" | "fast";

const VOICE_STYLE_LABELS: Record<LanguageCode, { label: string; natural: string; balanced: string; fast: string }> = {
  en: { label: "Voice", natural: "Natural", balanced: "Balanced", fast: "Fast" },
  tw: { label: "Nne", natural: "Natural", balanced: "Balanced", fast: "Fast" },
  ga: { label: "Voice", natural: "Natural", balanced: "Balanced", fast: "Fast" },
  ee: { label: "Gbe", natural: "Natural", balanced: "Balanced", fast: "Fast" },
  ha: { label: "Murya", natural: "Natural", balanced: "Balanced", fast: "Fast" },
};

const VOICE_PREVIEW_TEXT: Record<LanguageCode, string> = {
  en: "Hello. This is a quick preview of your selected voice style.",
  tw: "Agoo. Eyi yɛ wo nne nhyehyɛe a woapaw no hwɛsie tiawa.",
  ga: "Agoo. Eyi hewɔ voice style ni a otsɔɔ lɛ preview kpokpoi.",
  ee: "Fofo. Esia nye gbeɖiɖi ƒe kpɔkpɔa kpui a nètia.",
  ha: "Sannu. Wannan gajeren gwaji ne na salo na murya da ka zaɓa.",
};

const AI_ASSISTANT_COPY = {
  en: {
    switchToVoice: "Switch to voice chat",
    switchToText: "Switch to text chat",
    voiceChat: "Voice Chat",
    textChat: "Text Chat",
    welcomeTitle: "How can I help you today?",
    welcomeDescription: "Ask me health questions, describe symptoms, or upload a medical image for analysis. I support text, voice, and image input.",
    suggestions: [
      "I have a headache and fever",
      "What does my blood test result mean?",
      "Symptoms of malaria vs typhoid",
      "Help me prepare for a doctor visit",
    ],
    analyzeImageFallback: "Please analyze this medical image and provide your assessment.",
    imageWithOcrPrompt: (ocrText: string) => `This image may contain a medical report or document. Here is the extracted text:\n\n${ocrText}\n\nPlease analyze this report and summarize the key findings. If the image contains other medical information, analyze it visually as well.`,
    uploadedReportImagePrompt: (fileName: string) => `Please analyze this uploaded medical report image: ${fileName}`,
    uploadedPdfPrompt: (fileName: string, preview: string) => `I'm uploading a medical report PDF (${fileName}). Here is the extracted text:\n\n${preview}\n\nPlease analyze this report and summarize the key findings.`,
    uploadedReportPrompt: (fileName: string, preview: string) => `I'm uploading a medical report (${fileName}). Here is the content:\n\n${preview}\n\nPlease analyze this report and summarize the key findings.`,
    fileTooLargeTitle: "File too large",
    fileTooLargeImageDescription: "Max 10 MB for images.",
    fileTooLargeDescription: "Max 10 MB.",
    imageOcrFailedTitle: "Image OCR Failed",
    imageOcrFailedDescription: "Could not extract text from image.",
    pdfFailedTitle: "PDF Extraction Failed",
    pdfFailedDescription: "Could not extract text from PDF.",
    speechErrorTitle: "Speech Error",
    speechErrorDescription: "Could not recognize speech. Please try again or type your message.",
    voiceUnsupportedTitle: "Voice Not Supported",
    voiceUnsupportedDescription: "Your browser doesn't support speech recognition. Please type your message instead.",
    microphoneErrorTitle: "Microphone Error",
    microphoneErrorDescription: "Could not access microphone.",
    noSpeechTitle: "No speech detected",
    noSpeechDescription: "Please speak clearly and try again.",
    listeningFallbackTitle: "Listening...",
    listeningFallbackDescription: "Speak now - using browser speech recognition as fallback.",
    voiceUnavailableTitle: "Voice Unavailable",
    voiceUnavailableDescription: "Text-to-speech is not available. Please read the response instead.",
    listening: "Listening...",
    saySomething: "Say something...",
    pressMic: "Press the mic to start speaking",
    duration: "Duration",
    listeningIndicator: "Listening...",
    stop: "Stop",
    transcribing: "Transcribing your speech...",
    uploadAria: "Upload file or image",
    uploadedAlt: "Uploaded file preview",
    inputPlaceholder: "Ask anything",
    inputListeningPlaceholder: "Listening...",
    inputTranscribingPlaceholder: "Transcribing...",
    startVoiceInput: "Start voice input",
    stopRecording: "Stop recording",
    send: "Send",
    listen: "Listen",
  },
  tw: {
    switchToVoice: "Sesae kɔ kasa mu",
    switchToText: "Sesae kɔ twerɛ mu",
    voiceChat: "Kasa Mu",
    textChat: "Twerɛ Mu",
    welcomeTitle: "Mɛboa wo dɛn nnɛ?",
    welcomeDescription: "Bisa me apɔmuden ho nsɛmmisa, kyerɛkyerɛ wo yareɛ nsɛnkyerɛnne, anaa fa mfonini ba ma menhwehwɛ mu. Metumi de twerɛ, nne, ne mfonini ayɛ adwuma.",
    suggestions: [
      "Me ti yε me na mewɔ atiridii",
      "Dɛn na me mogya nhwehwɛmu kyerɛ?",
      "Malaria ne typhoid nsɛnkyerɛnne",
      "Boa me ma mensiesie me ho ansa na makɔ ayaresabea",
    ],
    analyzeImageFallback: "Yɛ me ayare ho mfonini yi ho nhwehwɛmu na ma me wo nhwehwɛmu mu adwene.",
    imageWithOcrPrompt: (ocrText: string) => `Eyi betumi ayɛ ayaresa krataa anaa dɔkita krataa. Nsɛm a yɛyii fii mu no ni:\n\n${ocrText}\n\nYɛ krataa yi ho nhwehwɛmu na bɔ mu tɔfa atitiriw no mu. Sɛ mfonini no wɔ ayaresa ho nsɛm foforo a, hwɛ no nso.`,
    uploadedReportImagePrompt: (fileName: string) => `Yɛ ayaresa krataa mfonini a wɔde aba yi ho nhwehwɛmu: ${fileName}`,
    uploadedPdfPrompt: (fileName: string, preview: string) => `Mede ayaresa krataa PDF (${fileName}) reba. Nsɛm a yɛyii fii mu no ni:\n\n${preview}\n\nYɛ krataa yi ho nhwehwɛmu na bɔ mu tɔfa atitiriw no mu.`,
    uploadedReportPrompt: (fileName: string, preview: string) => `Mede ayaresa krataa (${fileName}) reba. Ne mu nsɛm no ni:\n\n${preview}\n\nYɛ krataa yi ho nhwehwɛmu na bɔ mu tɔfa atitiriw no mu.`,
    fileTooLargeTitle: "Fael no sõ dodo",
    fileTooLargeImageDescription: "Mfonini mu kɛse ntumi ntra 10 MB.",
    fileTooLargeDescription: "Fael no ntumi ntra 10 MB.",
    imageOcrFailedTitle: "Antumi anyi nsɛm amfi mfonini no mu",
    imageOcrFailedDescription: "Yɛantumi anyi nsɛm amfi mfonini no mu.",
    pdfFailedTitle: "PDF yi mu nsɛm anyi",
    pdfFailedDescription: "Yɛantumi anyi nsɛm amfi PDF no mu.",
    speechErrorTitle: "Kasa mfomso",
    speechErrorDescription: "Yɛantumi anhu wo nne no. San yɛ bio anaa twerɛ wo nkrasɛm no.",
    voiceUnsupportedTitle: "Browser no nni nne boa",
    voiceUnsupportedDescription: "Wo browser no nni nne-hunu mu mmoa. Yɛsrɛ wo, twerɛ wo nkrasɛm no mmom.",
    microphoneErrorTitle: "Mikrofon mfomso",
    microphoneErrorDescription: "Yɛantumi annya mikrofon no ho kwan.",
    noSpeechTitle: "Yɛante nne biara",
    noSpeechDescription: "Yɛsrɛ wo kasa pefee na san yɛ bio.",
    listeningFallbackTitle: "Retie...",
    listeningFallbackDescription: "Kasa seesei - yɛde browser nne-hunu reboa.",
    voiceUnavailableTitle: "Nne no nni hɔ",
    voiceUnavailableDescription: "Text-to-speech nni hɔ. Yɛsrɛ wo kenkan mmuae no mmom.",
    listening: "Retie...",
    saySomething: "Ka biribi...",
    pressMic: "Hyɛ mic no so na fi ase kasa",
    duration: "Bere",
    listeningIndicator: "Retie...",
    stop: "Gyae",
    transcribing: "Yɛrekyerɛ wo nne no agu nsɛm mu...",
    uploadAria: "Fa fael anaa mfonini ba",
    uploadedAlt: "Mfonini a wɔde aba",
    inputPlaceholder: "Bisa biribiara",
    inputListeningPlaceholder: "Retie...",
    inputTranscribingPlaceholder: "Yɛrekyerɛ agu nsɛm mu...",
    startVoiceInput: "Fi ase ka",
    stopRecording: "Gyae nne kyerew",
    send: "Soma",
    listen: "Tie",
  },
  ga: {
    switchToVoice: "Bue niyɔŋmɔ kasa",
    switchToText: "Bue mantsɛ mli",
    voiceChat: "Niyɔŋmɔ Kasa",
    textChat: "Mantsɛ",
    welcomeTitle: "Mibɔɔ bo dɛn lɛ?",
    welcomeDescription: "Buu mi apɔmɔtsɔmɔ hewalɛi, tsɔmi mli shihilɛmɔi, alo lɛ mli medical aworan ni mihewalɛ. Miyaa mantsɛ, niyɔŋmɔ kɛ aworan input.",
    suggestions: [
      "Mitsui gbɛmɔ kɛ fever",
      "Medaa mli blood test result lɛ shishi?",
      "Malaria kɛ typhoid shihilɛmɔi",
      "Bɔɔ mi ni miakɛ doctor he",
    ],
    analyzeImageFallback: "Hewalɛ medical aworan ni kɛ bo mi assessment.",
    imageWithOcrPrompt: (ocrText: string) => `Aworan ni saa medical report alo document. Text ni yɛ kɛ bo ni:\n\n${ocrText}\n\nHewalɛ report ni kɛ tsɔ summary of key findings. Ni medical information hewɔ mli lɛ, hewalɛ amɛi hu.`,
    uploadedReportImagePrompt: (fileName: string) => `Hewalɛ medical report image ni a wɔtsɔ ba: ${fileName}`,
    uploadedPdfPrompt: (fileName: string, preview: string) => `Mi tsɔɔ medical report PDF (${fileName}) ba. Text ni yɛ kɛ bo ni:\n\n${preview}\n\nHewalɛ report ni kɛ tsɔ summary of key findings.`,
    uploadedReportPrompt: (fileName: string, preview: string) => `Mi tsɔɔ medical report (${fileName}) ba. Lɛ mli content ni:\n\n${preview}\n\nHewalɛ report ni kɛ tsɔ summary of key findings.`,
    fileTooLargeTitle: "File ni yɛ kpaa",
    fileTooLargeImageDescription: "Image lɛ ko ejoo 10 MB.",
    fileTooLargeDescription: "File lɛ ko ejoo 10 MB.",
    imageOcrFailedTitle: "Image OCR yɛ boɔ",
    imageOcrFailedDescription: "Mitaŋ yɛ image lɛ mli text.",
    pdfFailedTitle: "PDF extraction yɛ boɔ",
    pdfFailedDescription: "Mitaŋ yɛ PDF lɛ mli text.",
    speechErrorTitle: "Kasa boɔ",
    speechErrorDescription: "Mitaŋ yɔ niyɔŋmɔ lɛ. Kɛ ekofo alo tsɔ mantsɛ.",
    voiceUnsupportedTitle: "Browser niyaa voice support baa",
    voiceUnsupportedDescription: "Wo browser niyaa speech recognition baa. Tsɔ mantsɛ mmom.",
    microphoneErrorTitle: "Microphone boɔ",
    microphoneErrorDescription: "Mitaŋ yaa microphone lɛ.",
    noSpeechTitle: "Niyɔŋmɔ ko yɔ",
    noSpeechDescription: "Kasa tsɔɔ ni kɛ ekofo bio.",
    listeningFallbackTitle: "Miye niyɔŋmɔ...",
    listeningFallbackDescription: "Kasa shishi - browser speech recognition fallback ni nɔɔ.",
    voiceUnavailableTitle: "Voice ko nɔ",
    voiceUnavailableDescription: "Text-to-speech ko nɔ. Tsɔɔ answer lɛ kɛe.",
    listening: "Miye niyɔŋmɔ...",
    saySomething: "Kasa nyɛ...",
    pressMic: "Nyɔ mic lɛ ni fɔɔ kasa",
    duration: "Mberɛ",
    listeningIndicator: "Miye niyɔŋmɔ...",
    stop: "Tso",
    transcribing: "Miyi wo niyɔŋmɔ lɛ mli mantsɛ...",
    uploadAria: "Tsɔ file alo image ba",
    uploadedAlt: "File preview a wɔtsɔ ba",
    inputPlaceholder: "Buu hewalɛ hewalɛmɔ hewalɛ",
    inputListeningPlaceholder: "Miye niyɔŋmɔ...",
    inputTranscribingPlaceholder: "Miyi mantsɛ...",
    startVoiceInput: "Fɔɔ voice input",
    stopRecording: "Tso recording",
    send: "Kɛ",
    listen: "Nɔ",
  },
  ee: {
    switchToVoice: "Trɔ yi dzi gbeɖiɖi me",
    switchToText: "Trɔ yi dzi nuŋɔŋɔ me",
    voiceChat: "Gbeɖiɖi",
    textChat: "Nuŋɔŋɔ",
    welcomeTitle: "Aleke mate ŋu akpe ɖe ŋuwò egbe?",
    welcomeDescription: "Bia nya siwo ku ɖe lãmesẽ ŋu, gblɔ nudzɔdzɔmeviwo, alo ɖo medical nɔnɔmetata ɖe eme be maɖe egɔme. Mewɔa dɔ kple nuŋɔŋɔ, gbe, kple nɔnɔmetata.",
    suggestions: [
      "Ta le vevim eye asra le dzim",
      "Nu ka nye blood test result gblɔna?",
      "Malaria kple typhoid dzesiwo",
      "Kpe ɖe ŋunye be maɖo ŋku doctor gbɔ yiɖe",
    ],
    analyzeImageFallback: "Taflatse, ɖe egɔme le medical nɔnɔmetata sia me eye nàtsɔ assessment na me.",
    imageWithOcrPrompt: (ocrText: string) => `Nɔnɔmetata sia ate ŋu anye medical report alo document. Text si míekpɔ le eme lae nye esi:\n\n${ocrText}\n\nTaflatse, ɖe egɔme le report sia me eye nàwɔ key findings summary. Ne medical information bubu le eme la, ɖe egɔme hã.`,
    uploadedReportImagePrompt: (fileName: string) => `Taflatse, ɖe egɔme le medical report nɔnɔmetata si wowɔ upload la me: ${fileName}`,
    uploadedPdfPrompt: (fileName: string, preview: string) => `Mele medical report PDF (${fileName}) upload ge. Text si míekpɔ le eme lae nye esi:\n\n${preview}\n\nTaflatse, ɖe egɔme le report sia me eye nàwɔ key findings summary.`,
    uploadedReportPrompt: (fileName: string, preview: string) => `Mele medical report (${fileName}) upload ge. Esi le eme lae nye esi:\n\n${preview}\n\nTaflatse, ɖe egɔme le report sia me eye nàwɔ key findings summary.`,
    fileTooLargeTitle: "File la gã akpa",
    fileTooLargeImageDescription: "Nɔnɔmetata mele 10 MB wu ge o.",
    fileTooLargeDescription: "File la mele 10 MB wu ge o.",
    imageOcrFailedTitle: "Míemate ŋu ɖe text tso nɔnɔmetata me o",
    imageOcrFailedDescription: "Míemate ŋu ɖe text tso nɔnɔmetata me o.",
    pdfFailedTitle: "PDF extraction geɖe o",
    pdfFailedDescription: "Míemate ŋu ɖe text tso PDF me o.",
    speechErrorTitle: "Gbeɖiɖi ƒe vodada",
    speechErrorDescription: "Míemate ŋu se gbe la o. Taflatse gblɔ ake alo naŋlɔ wo nya la.",
    voiceUnsupportedTitle: "Browser la mekpɔ gbeʋuɖoɖo o",
    voiceUnsupportedDescription: "Wo browser la mekpɔ speech recognition o. Taflatse naŋlɔ wo nya la potae.",
    microphoneErrorTitle: "Microphone ƒe vodada",
    microphoneErrorDescription: "Míemate ŋu kpɔ microphone la o.",
    noSpeechTitle: "Míemese gbe aɖeke o",
    noSpeechDescription: "Taflatse gblɔ nyuie eye nàte ŋu agbugbɔe ake.",
    listeningFallbackTitle: "Mele se ge...",
    listeningFallbackDescription: "Gblɔ fifia - browser speech recognition wɔ dɔ le afisia.",
    voiceUnavailableTitle: "Gbeɖiɖi mele o",
    voiceUnavailableDescription: "Text-to-speech mele o. Taflatse xlẽ answer la.",
    listening: "Mele se ge...",
    saySomething: "Gblɔ nane...",
    pressMic: "Zi mic la be nàdze gɔme gblɔ",
    duration: "Game",
    listeningIndicator: "Mele se ge...",
    stop: "Tᴐ",
    transcribing: "Mele wo gbe la trɔm wòle nuŋɔŋɔ me...",
    uploadAria: "Upload file alo nɔnɔmetata",
    uploadedAlt: "Upload preview",
    inputPlaceholder: "Bia nuɖuɖu aɖeke",
    inputListeningPlaceholder: "Mele se ge...",
    inputTranscribingPlaceholder: "Mele trɔm...",
    startVoiceInput: "Dze gbeɖiɖi gɔme",
    stopRecording: "Tᴐ recording",
    send: "Ɖo",
    listen: "Se",
  },
  ha: {
    switchToVoice: "Canja zuwa magana",
    switchToText: "Canja zuwa rubutu",
    voiceChat: "Tattaunawar Murya",
    textChat: "Tattaunawar Rubutu",
    welcomeTitle: "Ta yaya zan taimaka maka yau?",
    welcomeDescription: "Ka tambaye ni tambayoyin lafiya, ka bayyana alamomin rashin lafiya, ko ka loda hoton likita domin nazari. Ina tallafawa rubutu, murya, da hoto.",
    suggestions: [
      "Ina da ciwon kai da zazzabi",
      "Menene sakamakon gwajin jinina yake nufi?",
      "Alamomin malaria da typhoid",
      "Ka taimaka mini na shirya ganin likita",
    ],
    analyzeImageFallback: "Da fatan za a bincika wannan hoton lafiya kuma a ba ni sharhi.",
    imageWithOcrPrompt: (ocrText: string) => `Wannan hoton na iya dauke da rahoton lafiya ko takarda. Ga rubutun da aka cire:\n\n${ocrText}\n\nDa fatan za a bincika wannan rahoto kuma a takaita mahimman bayanai. Idan hoton yana dauke da wasu bayanan lafiya, a bincika su ma.`,
    uploadedReportImagePrompt: (fileName: string) => `Da fatan za a bincika wannan hoton rahoton lafiya da aka loda: ${fileName}`,
    uploadedPdfPrompt: (fileName: string, preview: string) => `Ina loda rahoton lafiya PDF (${fileName}). Ga rubutun da aka cire:\n\n${preview}\n\nDa fatan za a bincika wannan rahoto kuma a takaita mahimman bayanai.`,
    uploadedReportPrompt: (fileName: string, preview: string) => `Ina loda rahoton lafiya (${fileName}). Ga abin da ke ciki:\n\n${preview}\n\nDa fatan za a bincika wannan rahoto kuma a takaita mahimman bayanai.`,
    fileTooLargeTitle: "Fayil ya yi girma sosai",
    fileTooLargeImageDescription: "Iyakar hoto ita ce 10 MB.",
    fileTooLargeDescription: "Iyakar fayil ita ce 10 MB.",
    imageOcrFailedTitle: "An kasa cire rubutu daga hoto",
    imageOcrFailedDescription: "Ba a iya cire rubutu daga hoton ba.",
    pdfFailedTitle: "An kasa cire rubutu daga PDF",
    pdfFailedDescription: "Ba a iya cire rubutu daga PDF ba.",
    speechErrorTitle: "Kuskuren magana",
    speechErrorDescription: "Ba a iya gane maganar ba. A sake gwadawa ko a rubuta sakonka.",
    voiceUnsupportedTitle: "Ba a tallafa murya ba",
    voiceUnsupportedDescription: "Browser dinka baya tallafawa gane magana. A rubuta sakonka maimakon haka.",
    microphoneErrorTitle: "Kuskuren makirufo",
    microphoneErrorDescription: "Ba a iya samun damar amfani da makirufo ba.",
    noSpeechTitle: "Ba a gano magana ba",
    noSpeechDescription: "Yi magana a fili sannan a sake gwadawa.",
    listeningFallbackTitle: "Ana sauraro...",
    listeningFallbackDescription: "Yi magana yanzu - ana amfani da speech recognition na browser a madadin.",
    voiceUnavailableTitle: "Muryar ba ta samuwa",
    voiceUnavailableDescription: "Text-to-speech ba ya samuwa. Da fatan za a karanta amsar maimakon haka.",
    listening: "Ana sauraro...",
    saySomething: "Faɗi wani abu...",
    pressMic: "Danna mic don fara magana",
    duration: "Lokaci",
    listeningIndicator: "Ana sauraro...",
    stop: "Tsaya",
    transcribing: "Ana maida maganarka zuwa rubutu...",
    uploadAria: "Loda fayil ko hoto",
    uploadedAlt: "Abin da aka loda",
    inputPlaceholder: "Tambayi komai",
    inputListeningPlaceholder: "Ana sauraro...",
    inputTranscribingPlaceholder: "Ana rubutawa...",
    startVoiceInput: "Fara shigar murya",
    stopRecording: "Dakatar da rikodi",
    send: "Aika",
    listen: "Saurara",
  },
} as const;

function AIAssistant() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: medicalHistory } = useMedicalHistory();
  const { data: medicalHistoryFiles = [] } = useMedicalHistoryFiles();
  const chatStorageKey = `neo-synapse-ai-chat:${user?.id || "guest"}`;
  const medicalHistoryContext = buildMedicalHistoryContext(medicalHistory, medicalHistoryFiles);
  const {
    messages,
    sessions,
    activeSessionId,
    isLoading,
    syncStatus,
    sendMessage,
    clearChat,
    setActiveSessionId,
    createNewSession,
    renameSession,
    toggleSessionPinned,
    deleteSession,
    retrySync,
  } = useMedicalChat({ storageKey: chatStorageKey, userId: user?.id, contextMessage: medicalHistoryContext });
  const [searchParams, setSearchParams] = useSearchParams();
  const { language, setLanguage } = useLanguage();
  const copy = AI_ASSISTANT_COPY[language] || AI_ASSISTANT_COPY.en;
  const styleLabels = VOICE_STYLE_LABELS[language] || VOICE_STYLE_LABELS.en;
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Voice mode: manual listen/respond
  const [autoVoice, setAutoVoice] = useState(false); // auto-play TTS for voice-initiated msgs
  const [liveTranscript, setLiveTranscript] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>(() => {
    const saved = localStorage.getItem("ai-assistant-voice-style");
    return saved === "natural" || saved === "balanced" || saved === "fast" ? saved : "natural";
  });
  // Always default to text mode when opening the AI Assistant
  const [mode, setMode] = useState("text");
  const [sessionSearch, setSessionSearch] = useState("");
  // Remove continuous voice loop
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any | null>(null);
  const transcriptRef = useRef("");
  const stopRequestedRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadCancelRef = useRef(false);
  const ocrWorkerRef = useRef<any | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speakRequestIdRef = useRef(0);
  const prevMessageCountRef = useRef(0);
  const lastUrlQueryRef = useRef<string | null>(null);
  const savedReportSignaturesRef = useRef<Set<string>>(new Set());
  // --- Suggestion chip highlight state ---
  const [highlightedChip, setHighlightedChip] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewText = VOICE_PREVIEW_TEXT[language] || VOICE_PREVIEW_TEXT.en;
  const normalizedSessionSearch = sessionSearch.trim().toLowerCase();
  const orderedSessions = useMemo(() => {
    const filtered = sessions.filter((session) => {
      if (!normalizedSessionSearch) return true;

      if (session.name.toLowerCase().includes(normalizedSessionSearch)) return true;

      return session.messages.some((message) =>
        message.content.toLowerCase().includes(normalizedSessionSearch)
      );
    });

    return [...filtered].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [sessions, normalizedSessionSearch]);

  const formatSessionTimestamp = (timestamp: Date) =>
    timestamp.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const renderSyncIndicator = () => {
    if (!user?.id) return null;

    if (syncStatus === "syncing") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Syncing
        </span>
      );
    }

    if (syncStatus === "retry") {
      return (
        <button
          type="button"
          onClick={retrySync}
          className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/20"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          Retry
          <RefreshCw className="h-3 w-3" />
        </button>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Synced
      </span>
    );
  };

  const handleRenameSession = (sessionId: string, currentName: string) => {
    const nextName = window.prompt("Rename conversation", currentName);
    if (!nextName || !nextName.trim()) return;
    renameSession(sessionId, nextName.trim());
  };

  const handleDeleteSession = (sessionId: string, sessionName: string) => {
    const confirmed = window.confirm(`Delete conversation \"${sessionName}\"?`);
    if (!confirmed) return;
    deleteSession(sessionId);
  };

  const cancelUploadProcessing = useCallback(async () => {
    uploadCancelRef.current = true;
    setUploadStatus("Canceling PDF extraction...");

    if (ocrWorkerRef.current) {
      try {
        await ocrWorkerRef.current.terminate();
      } catch {
        // Ignore worker shutdown errors.
      } finally {
        ocrWorkerRef.current = null;
      }
    }
  }, []);

  const handleChipClick = (chipText: string, idx: number) => {
    setInput(chipText);
    setHighlightedChip(idx);
    setTimeout(() => setHighlightedChip(null), 300);
    textareaRef.current?.focus();
  };

  // Persist mode in localStorage
  useEffect(() => {
    localStorage.setItem("ai-assistant-mode", mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("ai-assistant-voice-style", voiceStyle);
  }, [voiceStyle]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-send dashboard search query when arriving with ?query=...
  useEffect(() => {
    const queryFromUrl = searchParams.get("query")?.trim() || "";
    if (!queryFromUrl || isLoading || lastUrlQueryRef.current === queryFromUrl) return;

    lastUrlQueryRef.current = queryFromUrl;
    setInput("");
    setAutoVoice(false);
    sendMessage(queryFromUrl);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("query");
    setSearchParams(nextParams, { replace: true });
  }, [isLoading, searchParams, sendMessage, setSearchParams]);

  // Auto-play TTS when assistant finishes responding (voice-initiated)
  useEffect(() => {
    if (!autoVoice || isLoading) return;
    const lastMsg = messages[messages.length - 1];
    if (
      lastMsg?.role === "assistant" &&
      messages.length > prevMessageCountRef.current &&
      lastMsg.content.length > 10
    ) {
      setAutoVoice(false);
      speakText(lastMsg.content);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, isLoading, autoVoice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore shutdown errors.
        }
      }
      audioRef.current?.pause();
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      uploadCancelRef.current = true;
      if (ocrWorkerRef.current) {
        void ocrWorkerRef.current.terminate().catch(() => undefined);
        ocrWorkerRef.current = null;
      }
    };
  }, []);

  // ---- Text send ----
  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    setAutoVoice(false);
    sendMessage(trimmed);
  };

  // ---- Image upload ----
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: copy.fileTooLargeTitle, description: copy.fileTooLargeImageDescription, variant: "destructive" });
      e.target.value = "";
      return;
    }
    try {
      // Run OCR on the image using the currently selected assistant language.
      const ocrText = await extractImageText(file, language);
      if (ocrText && ocrText.replace(/\s/g, "").length > 20) {
        // If OCR finds enough text, send both the text and the image
        sendMessage(copy.imageWithOcrPrompt(ocrText), await fileToBase64(file));
      } else {
        // If not much text, just send the image for visual analysis
        sendMessage(input.trim() || copy.analyzeImageFallback, await fileToBase64(file));
      }
    } catch (err) {
      toast({ title: copy.imageOcrFailedTitle, description: copy.imageOcrFailedDescription, variant: "destructive" });
      // Fallback: send image only
      const base64 = await fileToBase64(file);
      sendMessage(input.trim() || copy.analyzeImageFallback, base64);
    }
    setInput("");
    e.target.value = "";
  };

  // Helper to convert file to base64
  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---- File (report) upload ----
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadCancelRef.current = false;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: copy.fileTooLargeTitle, description: copy.fileTooLargeDescription, variant: "destructive" });
      e.target.value = "";
      return;
    }
    // For images, run OCR + vision prompt pipeline.
    if (file.type.startsWith("image/")) {
      try {
        const ocrText = await extractImageText(file, language);
        const base64 = await fileToBase64(file);

        if (ocrText && ocrText.replace(/\s/g, "").length > 20) {
          sendMessage(copy.imageWithOcrPrompt(ocrText), base64);
        } else {
          sendMessage(copy.uploadedReportImagePrompt(file.name), base64);
        }
      } catch {
        const base64 = await fileToBase64(file);
        sendMessage(copy.uploadedReportImagePrompt(file.name), base64);
      }
    } else if (file.type === "application/pdf") {
      // Extract text from PDF and send to AI
      try {
        setUploadStatus("Extracting text from PDF...");
        const text = await extractPdfText(file, {
          language,
          onProgress: (status) => setUploadStatus(status),
          shouldCancel: () => uploadCancelRef.current,
          workerRef: ocrWorkerRef,
        });
        const preview = text.slice(0, 6000);
        sendMessage(copy.uploadedPdfPrompt(file.name, preview));
      } catch (err) {
        if (!isUploadCancelledError(err)) {
          toast({ title: copy.pdfFailedTitle, description: copy.pdfFailedDescription, variant: "destructive" });
        }
      } finally {
        uploadCancelRef.current = false;
        ocrWorkerRef.current = null;
        setUploadStatus(null);
      }
    } else {
      try {
        const text = await extractDocumentText(file);
        const preview = text.slice(0, 6000);
        if (!preview.trim()) {
          throw new Error("No readable text content found.");
        }
        sendMessage(copy.uploadedReportPrompt(file.name, preview));
      } catch (error) {
        const description = error instanceof Error
          ? error.message
          : "Unsupported or unreadable file. Use PDF, DOCX, TXT, CSV, or image files.";
        toast({
          title: "File could not be analyzed",
          description,
          variant: "destructive",
        });
      }
    }
    e.target.value = "";
  };

  async function extractDocumentText(file: File): Promise<string> {
    const name = file.name.toLowerCase();
    const isDocx = file.type === DOCX_MIME || name.endsWith(".docx");
    const isDoc = file.type === DOC_MIME || name.endsWith(".doc");

    if (isDoc) {
      throw new Error("Legacy .doc files are not supported in-browser. Please upload a .docx or PDF.");
    }

    if (isDocx) {
      const mammoth = await import("mammoth/mammoth.browser");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return (result.value || "").replace(/\n{3,}/g, "\n\n").trim();
    }

    const text = await file.text();
    if (isLikelyBinaryText(text)) {
      throw new Error("This file looks binary/unreadable. Please upload a PDF, DOCX, TXT, CSV, or image.");
    }
    return text;
  }

  function isLikelyBinaryText(text: string): boolean {
    if (!text) return false;
    const sample = text.slice(0, 2500);
    let suspicious = 0;

    for (let i = 0; i < sample.length; i++) {
      const code = sample.charCodeAt(i);
      const isControl = code < 9 || (code > 13 && code < 32);
      const isReplacement = sample[i] === "�";
      if (isControl || isReplacement) suspicious++;
    }

    return suspicious / sample.length > 0.08;
  }

  // ---- Voice recording ----
  // Manual voice mode: only start listening when user triggers
  const startRecording = useCallback(async () => {
    try {
      if (isRecording) return;
      setLiveTranscript("");
      transcriptRef.current = "";
      stopRequestedRef.current = false;

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = RECOGNITION_LANGUAGE_MAP[language] || RECOGNITION_LANGUAGE_MAP.en;
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 1;

        setIsRecording(true);
        setRecordingDuration(0);
        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration((d) => d + 1);
        }, 1000);

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const chunk = event.results[i][0]?.transcript || "";
            if (event.results[i].isFinal) {
              transcriptRef.current += `${chunk} `;
            } else {
              interimTranscript += chunk;
            }
          }
          setLiveTranscript(`${transcriptRef.current}${interimTranscript}`.trim());
        };

        recognition.onend = () => {
          recognitionRef.current = null;
          setIsRecording(false);
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }
          setRecordingDuration(0);

          const finalTranscript = transcriptRef.current.trim();
          transcriptRef.current = "";
          if (finalTranscript) {
            setAutoVoice(true);
            sendMessage(finalTranscript);
            setLiveTranscript("");
          } else if (!stopRequestedRef.current) {
            toast({ title: copy.noSpeechTitle, description: copy.noSpeechDescription, variant: "destructive" });
          }
          stopRequestedRef.current = false;
        };

        recognition.onerror = () => {
          if (!stopRequestedRef.current) {
            setIsRecording(false);
            setLiveTranscript("");
            toast({ title: copy.speechErrorTitle, description: copy.speechErrorDescription, variant: "destructive" });
          }
        };
        recognition.start();
      } else {
        toast({ title: copy.voiceUnsupportedTitle, description: copy.voiceUnsupportedDescription, variant: "destructive" });
      }
    } catch (err: unknown) {
      toast({ title: copy.microphoneErrorTitle, description: copy.microphoneErrorDescription, variant: "destructive" });
    }
  }, [language, sendMessage, copy, isRecording]);

  // Stop recording only
  const stopRecording = useCallback(() => {
    stopRequestedRef.current = true;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors.
      }
    }
    setIsRecording(false);
    setLiveTranscript("");
  }, []);

  // ---- Text-to-Speech (browser speech synthesis, prefer Google voices) ----
  const speakText = async (text: string) => {
    if (!("speechSynthesis" in window)) {
      toast({ title: copy.voiceUnavailableTitle, description: copy.voiceUnavailableDescription, variant: "destructive" });
      return;
    }

    setIsSpeaking(true);

    const cleanText = text
      .replace(/[#*_`~\[\]()>]/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .replace(/\s*([,;:])\s*/g, "$1 ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);

    const synth = window.speechSynthesis;
    const targetLang = SPEECH_LANGUAGE_MAP[language] || SPEECH_LANGUAGE_MAP.en;
    const requestId = ++speakRequestIdRef.current;

    const getVoices = async (): Promise<SpeechSynthesisVoice[]> => {
      const existing = synth.getVoices();
      if (existing.length > 0) return existing;
      return await new Promise((resolve) => {
        const handler = () => {
          const loaded = synth.getVoices();
          if (loaded.length > 0) {
            synth.removeEventListener("voiceschanged", handler);
            resolve(loaded);
          }
        };
        synth.addEventListener("voiceschanged", handler);
        setTimeout(() => {
          synth.removeEventListener("voiceschanged", handler);
          resolve(synth.getVoices());
        }, 700);
      });
    };

    const pickVoice = (voices: SpeechSynthesisVoice[]) => {
      const langPrefix = targetLang.toLowerCase().slice(0, 2);
      const compatible = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
      if (compatible.length === 0) return null;

      const scored = compatible
        .map((voice) => {
          const name = voice.name.toLowerCase();
          let score = 0;

          if (voice.lang.toLowerCase() === targetLang.toLowerCase()) score += 40;
          if (!voice.localService) score += 8;

          if (/google|siri|samantha|neural|wavenet|premium|natural/.test(name)) score += 30;
          if (/female|woman|zira|aria|jenny/.test(name)) score += 8;
          if (/compact|espeak|robot|classic/.test(name)) score -= 25;

          return { voice, score };
        })
        .sort((a, b) => b.score - a.score);

      return scored[0]?.voice || null;
    };

    const splitIntoChunks = (value: string, maxLen = 220) => {
      const sentences = value.match(/[^.!?]+[.!?]*/g) || [value];
      const chunks: string[] = [];
      let current = "";
      for (const raw of sentences) {
        const sentence = raw.trim();
        if (!sentence) continue;
        if ((`${current} ${sentence}`).trim().length <= maxLen) {
          current = `${current} ${sentence}`.trim();
        } else {
          if (current) chunks.push(current);
          if (sentence.length <= maxLen) {
            current = sentence;
          } else {
            const words = sentence.split(" ");
            let line = "";
            for (const word of words) {
              if ((`${line} ${word}`).trim().length <= maxLen) {
                line = `${line} ${word}`.trim();
              } else {
                if (line) chunks.push(line);
                line = word;
              }
            }
            current = line;
          }
        }
      }
      if (current) chunks.push(current);
      return chunks;
    };

    try {
      synth.cancel();
      const voices = await getVoices();
      const voice = pickVoice(voices);
      const chunks = splitIntoChunks(cleanText);
      const prosodyByLang: Record<string, { rate: number; pitch: number }> = {
        en: { rate: 0.92, pitch: 1.0 },
        tw: { rate: 0.9, pitch: 0.98 },
        ga: { rate: 0.9, pitch: 0.98 },
        ee: { rate: 0.9, pitch: 0.98 },
        ha: { rate: 0.9, pitch: 0.98 },
      };
      const styleMultipliers: Record<VoiceStyle, { rate: number; pitch: number }> = {
        natural: { rate: 0.97, pitch: 1.02 },
        balanced: { rate: 1.03, pitch: 1.0 },
        fast: { rate: 1.14, pitch: 0.98 },
      };
      const base = prosodyByLang[language] || prosodyByLang.en;
      const style = styleMultipliers[voiceStyle] || styleMultipliers.natural;
      const prosody = {
        rate: Math.min(1.25, Math.max(0.75, base.rate * style.rate)),
        pitch: Math.min(1.3, Math.max(0.7, base.pitch * style.pitch)),
      };

      for (const chunk of chunks) {
        if (requestId !== speakRequestIdRef.current) {
          setIsSpeaking(false);
          return;
        }
        await new Promise<void>((resolve, reject) => {
          const utterance = new SpeechSynthesisUtterance(chunk);
          utterance.lang = targetLang;
          utterance.voice = voice;
          utterance.rate = prosody.rate;
          utterance.pitch = prosody.pitch;
          utterance.volume = 1;
          utterance.onend = () => resolve();
          utterance.onerror = () => reject(new Error("speech synthesis failed"));
          synth.speak(utterance);
        });

        // Tiny breath pause between chunks to reduce robotic cadence.
        const pauseByStyle: Record<VoiceStyle, number> = { natural: 90, balanced: 65, fast: 40 };
        await new Promise((resolve) => setTimeout(resolve, pauseByStyle[voiceStyle]));
      }
      setIsSpeaking(false);
    } catch {
      setIsSpeaking(false);
      toast({ title: copy.voiceUnavailableTitle, description: copy.voiceUnavailableDescription, variant: "destructive" });
    }
  };

  const stopSpeaking = () => {
    speakRequestIdRef.current += 1;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  };

  // Determine if input controls should be disabled
  const inputDisabled = isLoading || isTranscribing;

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const { markdown: generatedReportMarkdown, json: generatedReportJson } = extractReportAndJson(messages);

  // Auto-save generated AI report to medical_reports so it appears in Reports history.
  useEffect(() => {
    if (!user?.id || !generatedReportMarkdown) return;

    const jsonKey = generatedReportJson ? JSON.stringify(generatedReportJson).slice(0, 300) : "";
    const signature = `${generatedReportMarkdown.slice(0, 280)}|${jsonKey}`;
    if (savedReportSignaturesRef.current.has(signature)) return;

    let cancelled = false;
    const persistReport = async () => {
      const payload = {
        ...(generatedReportJson && typeof generatedReportJson === "object" ? generatedReportJson as Record<string, unknown> : {}),
        markdown: generatedReportMarkdown,
        source: "ai_assistant",
        generated_at: new Date().toISOString(),
      };

      const { error } = await medicalReportService.create({
        patient_id: user.id,
        report_type: "ai_assistant",
        report_json: payload,
      });

      if (cancelled) return;
      if (error) {
        console.error("Failed to auto-save AI report:", error);
        return;
      }

      savedReportSignaturesRef.current.add(signature);
      queryClient.invalidateQueries({ queryKey: ["my-reports", user.id] });
      queryClient.invalidateQueries({ queryKey: ["recent-reports", user.id] });
      toast({ title: "Report saved to history" });
    };

    persistReport();
    return () => {
      cancelled = true;
    };
  }, [generatedReportMarkdown, generatedReportJson, user?.id, queryClient]);

  // ---- Message Bubble ----
  const MessageBubble = ({ msg }: { msg: ChatMessage }) => {
    const isUser = msg.role === "user";
    return (
      <div className={`flex min-w-0 gap-2.5 sm:gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? "bg-primary/20" : "bg-accent/20"
        }`}>
          {isUser ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-accent" />}
        </div>
        <div className={`min-w-0 max-w-[92%] sm:max-w-[80%] rounded-2xl p-3 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-card border border-border"
        }`}>
          {msg.imageUrl && (
            <img src={msg.imageUrl} alt="Uploaded" className="mb-2 max-w-full rounded-lg" />
          )}
          <div className="prose prose-sm max-w-none break-words [overflow-wrap:anywhere]">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
          {!isUser && msg.content.length > 10 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.content)}
            >
              <Volume2 className="w-3 h-3 mr-1" />
              {isSpeaking ? copy.stop : copy.listen}
            </Button>
          )}
        </div>
      </div>
    );
  };
  return (
    <div className="flex min-h-screen flex-1 flex-col overflow-x-hidden bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-primary/90 px-4 py-2.5 backdrop-blur">
        {/* More options dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full border-primary/40 bg-background/80"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            {/* Language sub-menu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Languages className="mr-2 h-4 w-4" />
                {SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName ?? "Language"}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <DropdownMenuItem
                    key={l.code}
                    onClick={() => setLanguage(l.code as any)}
                    className={language === l.code ? "font-semibold" : ""}
                  >
                    {l.nativeName}
                    {language === l.code && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Voice</DropdownMenuLabel>

            {/* Voice style sub-menu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Volume2 className="mr-2 h-4 w-4" />
                {styleLabels.label}: {styleLabels[voiceStyle]}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(["natural", "balanced", "fast"] as VoiceStyle[]).map((vs) => (
                  <DropdownMenuItem
                    key={vs}
                    onClick={() => setVoiceStyle(vs)}
                    className={voiceStyle === vs ? "font-semibold" : ""}
                  >
                    {styleLabels[vs]}
                    {voiceStyle === vs && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Preview voice */}
            <DropdownMenuItem onClick={() => (isSpeaking ? stopSpeaking() : speakText(previewText))}>
              {isSpeaking ? (
                <><Square className="mr-2 h-4 w-4" />{copy.stop}</>
              ) : (
                <><Play className="mr-2 h-4 w-4" />Preview voice</>
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Clear current chat */}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                clearChat();
                toast({ title: "Chat cleared", description: "Saved assistant history has been removed." });
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Right-side controls */}
        <div className="ml-auto flex items-center gap-2">
          {renderSyncIndicator()}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full border-primary/40 bg-background/80"
            onClick={() => setMode(mode === "text" ? "voice" : "text")}
            aria-label={mode === "text" ? copy.switchToVoice : copy.switchToText}
            title={mode === "text" ? copy.voiceChat : copy.textChat}
          >
            {mode === "text" ? <Mic className="h-4 w-4" /> : <MessageSquareText className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        <aside className="hidden md:flex w-72 border-r border-border bg-muted/20 flex-col">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold">Conversations</p>
            <Button size="sm" variant="outline" onClick={() => createNewSession()}>
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </div>
          <div className="p-3 border-b border-border">
            <label className="flex items-center rounded-lg border border-border bg-background px-2 h-9">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={sessionSearch}
                onChange={(event) => setSessionSearch(event.target.value)}
                placeholder="Search conversations"
                className="ml-2 w-full bg-transparent text-sm text-foreground caret-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {orderedSessions.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                No conversations match your search.
              </div>
            )}
            {orderedSessions.map((session) => (
              <div
                key={session.id}
                className={`rounded-xl border p-2 ${activeSessionId === session.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}
              >
                <button
                  className="w-full text-left"
                  onClick={() => setActiveSessionId(session.id)}
                >
                  <p className="text-sm font-medium truncate flex items-center gap-1">
                    {session.name}
                    {session.isPinned && <Pin className="w-3 h-3 text-primary" />}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatSessionTimestamp(session.updatedAt)}</p>
                </button>
                <div className="flex items-center gap-1 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => toggleSessionPinned(session.id)}
                    title={session.isPinned ? "Unpin conversation" : "Pin conversation"}
                    aria-label={session.isPinned ? "Unpin conversation" : "Pin conversation"}
                  >
                    <Pin className={`w-3 h-3 ${session.isPinned ? "text-primary" : ""}`} />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleRenameSession(session.id, session.name)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleDeleteSession(session.id, session.name)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="md:hidden p-3 border-b border-border bg-muted/20 flex items-center gap-2">
            <Select value={activeSessionId || ""} onValueChange={(v) => setActiveSessionId(v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select conversation" />
              </SelectTrigger>
              <SelectContent>
                {orderedSessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => createNewSession()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Main Content: Text or Voice Mode */}
          {mode === "text" ? (
            <>
              {/* Welcome & Suggestions */}
              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center px-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2 text-center mt-8">{copy.welcomeTitle}</h2>
                  <p className="text-base text-muted-foreground mb-6 text-center max-w-xl">
                    {copy.welcomeDescription}
                  </p>
                  <div className="mb-6 w-full max-w-xl rounded-2xl border border-border/70 bg-card/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Best for general guidance</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Use AI Assistant for explanations, report interpretation, and follow-up questions.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => navigate("/patient/symptom-checker")}
                      >
                        Need urgency triage?
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 w-full max-w-lg mb-8 justify-center">
                    {copy.suggestions.map((chip, idx) => (
                      <Button
                        key={chip}
                        variant="outline"
                        className={`rounded-xl py-3 px-4 text-base font-medium border-primary/30 bg-background/80 whitespace-normal break-words text-center h-auto leading-snug transition-colors duration-200 ${highlightedChip === idx ? 'ring-2 ring-primary/70 bg-primary/10' : ''}`}
                        style={{ wordBreak: 'break-word', whiteSpace: 'normal', width: 'auto', minWidth: 0, maxWidth: '100%' }}
                        onClick={() => handleChipClick(chip, idx)}
                      >
                        {chip}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {messages.length > 0 && (
                <div className="flex-1 overflow-y-auto">
                  <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-4">
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} msg={msg} />
                    ))}
                    {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-accent" />
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-3">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                      </div>
                    )}

                    {generatedReportMarkdown && (
                      <MedicalReportTools
                        markdown={generatedReportMarkdown}
                        json={generatedReportJson}
                      />
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>
              )}
            </>
          ) : (
            // Voice Chat Mode
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <div className="flex flex-col items-center justify-center w-full">
                {/* Animated orb/visualizer */}
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 shadow-lg flex items-center justify-center mb-8 animate-pulse">
                  {/* Optionally add SVG or canvas animation here */}
                  <div className="w-40 h-40 rounded-full bg-background/80 shadow-inner" />
                </div>
                <div className="text-xl font-semibold text-primary mb-2">{isRecording ? copy.listening : copy.voiceChat}</div>
                <div className="text-base text-muted-foreground mb-4 min-h-[32px] max-w-lg text-center">
                  {isRecording && (liveTranscript || <span className="opacity-60">{copy.saySomething}</span>)}
                  {!isRecording && <span className="opacity-60">{copy.pressMic}</span>}
                </div>
                <Button
                  size="icon"
                  className={`h-20 w-20 rounded-full ${isRecording ? "bg-destructive" : "bg-primary"} text-primary-foreground shadow-lg flex items-center justify-center text-4xl ${isRecording ? "animate-pulse" : ""}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  aria-label={isRecording ? copy.stopRecording : copy.startVoiceInput}
                >
                  {isRecording ? <MicOff className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
                </Button>
                {isRecording && (
                  <div className="mt-2 text-xs text-muted-foreground">{copy.duration}: {formatDuration(recordingDuration)}</div>
                )}
              </div>
            </div>
          )}

          {/* Recording Indicator */}
          {isRecording && (
            <div className="border-t border-destructive/30 bg-destructive/10 px-3 py-3 sm:px-4">
              <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                  </span>
                  <span className="text-sm font-medium text-destructive">
                    {copy.listeningIndicator} {formatDuration(recordingDuration)}
                  </span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={stopRecording}
                  className="h-8 gap-1.5"
                >
                  <Square className="w-3 h-3" />
                  {copy.stop}
                </Button>
              </div>
            </div>
          )}

          {/* Transcribing Indicator */}
          {isTranscribing && (
            <div className="border-t border-primary/20 bg-primary/5 px-3 py-3 sm:px-4">
              <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">{copy.transcribing}</span>
              </div>
            </div>
          )}

          {/* Upload Processing Indicator */}
          {uploadStatus && (
            <div className="border-t border-primary/20 bg-primary/5 px-3 py-3 sm:px-4">
              <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground break-words [overflow-wrap:anywhere]">{uploadStatus}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 shrink-0"
                  onClick={() => void cancelUploadProcessing()}
                >
                  <X className="w-3 h-3" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Input - Redesigned Search Box UI */}
          <div className="sticky bottom-0 border-t border-border bg-background/95 p-3 backdrop-blur sm:p-6">
            <div className="mx-auto w-full max-w-2xl">
              <div className="flex items-center w-full rounded-full bg-card text-foreground border border-border shadow-sm px-4 py-2 gap-3" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.12)' }}>

            {/* Plus icon (left) for upload */}
            <>
              {/* Hidden file inputs */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.txt,.csv,.doc,.docx"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-accent/30 transition"
                tabIndex={-1}
                aria-label={copy.uploadAria}
                style={{ outline: 'none', border: 'none', background: 'none' }}
                onClick={() => {
                  // Open a menu or just trigger file upload for now
                  fileInputRef.current?.click();
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="9" stroke="#6B7280" strokeWidth="1.5" fill="none" />
                  <path d="M10 6V14" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M6 10H14" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </>

            {/* Text input */}
            <input
              ref={textareaRef as any}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isRecording ? copy.inputListeningPlaceholder : isTranscribing ? copy.inputTranscribingPlaceholder : copy.inputPlaceholder}
              disabled={inputDisabled || isRecording}
              className="flex-1 bg-transparent border-none outline-none text-base text-foreground caret-foreground px-2 placeholder:text-muted-foreground disabled:opacity-50"
              style={{ minWidth: 0 }}
            />

            {/* Mic icon */}
            <button
              type="button"
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-accent/30 transition"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing || isLoading}
              aria-label={isRecording ? copy.stopRecording : copy.startVoiceInput}
              style={{ outline: 'none', border: 'none', background: 'none' }}
            >
              {isRecording ? <MicOff className="w-5 h-5 text-primary animate-pulse" /> : <Mic className="w-5 h-5 text-muted-foreground" />}
            </button>

            {/* Send/voice button (right) */}
            <button
              type="button"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-primary hover:bg-primary/80 transition"
              onClick={handleSend}
              disabled={!input.trim() || inputDisabled}
              aria-label={copy.send}
              style={{ outline: 'none', border: 'none' }}
            >
              <Send className="w-5 h-5 text-white" />
            </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Medical Report Extraction ---
function extractReportAndJson(messages: ChatMessage[]) {
  // Find the last assistant message containing the report
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant" && m.content.includes("---JSON---"));
  if (!lastAssistantMsg) return { markdown: null, json: null };
  const [markdownPart, jsonPart] = lastAssistantMsg.content.split("---JSON---");
  let json = null;
  try {
    json = JSON.parse(jsonPart);
  } catch {}
  return { markdown: markdownPart?.trim() || null, json };
}

// --- PDF text extraction helper ---
  async function extractPdfText(
    file: File,
    options: {
      language: LanguageCode;
      onProgress?: (status: string) => void;
      shouldCancel?: () => boolean;
      workerRef?: { current: any | null };
    }
  ): Promise<string> {
    const assertNotCancelled = () => {
      if (options.shouldCancel?.()) {
        throw new UploadCancelledError();
      }
    };

    assertNotCancelled();
    const arrayBuffer = await file.arrayBuffer();
    if (!pdfjsLib) {
      pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
    }
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      assertNotCancelled();
      options.onProgress?.(`Extracting text from PDF... Page ${i} of ${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => (typeof item?.str === "string" ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (pageText) {
        text += `${pageText}\n`;
        continue;
      }

      assertNotCancelled();
      options.onProgress?.(`Scanning PDF page ${i} of ${pdf.numPages}...`);
      const pageBlob = await renderPdfPageToImageBlob(page);
      const ocrText = await extractImageText(
        new File([pageBlob], `pdf-page-${i}.png`, { type: "image/png" }),
        options.language,
        {
          shouldCancel: options.shouldCancel,
          workerRef: options.workerRef,
        }
      );
      assertNotCancelled();
      if (ocrText.trim()) {
        text += `${ocrText.trim()}\n`;
      }
    }

    const normalized = text.replace(/\n{3,}/g, "\n\n").trim();
    if (!normalized || normalized.replace(/\s/g, "").length < 20) {
      throw new Error("Could not extract readable text from this PDF.");
    }

    return normalized;
  }

  async function renderPdfPageToImageBlob(page: any): Promise<Blob> {
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not render PDF page.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: context, viewport }).promise;

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Could not export rendered PDF page."));
      }, "image/png");
    });
  }

// --- OCR image preprocessing ---
  async function preprocessImageForOcr(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          // 1. Upscale: Tesseract works best at ~300 dpi; scale up small images.
          const MAX_DIM = 2400;
          const MIN_DIM = 1000;
          let { width, height } = img;
          const maxSide = Math.max(width, height);
          if (maxSide < MIN_DIM) {
            const scale = MIN_DIM / maxSide;
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          } else if (maxSide > MAX_DIM) {
            const scale = MAX_DIM / maxSide;
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;

          // Draw with high-quality downscaling if needed.
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          // 2. Get pixel data for manual processing.
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;

          // 3. Convert to grayscale using perceptual luminance weights.
          for (let i = 0; i < data.length; i += 4) {
            const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            data[i] = lum;
            data[i + 1] = lum;
            data[i + 2] = lum;
          }

          // 4. Auto-contrast: stretch histogram so the darkest pixel → 0 and
          //    brightest → 255, avoiding clipping from extreme outliers (1% each tail).
          const luminances: number[] = [];
          for (let i = 0; i < data.length; i += 4) luminances.push(data[i]);
          luminances.sort((a, b) => a - b);
          const lo = luminances[Math.floor(luminances.length * 0.01)];
          const hi = luminances[Math.floor(luminances.length * 0.99)];
          const range = hi - lo || 1;
          for (let i = 0; i < data.length; i += 4) {
            const stretched = Math.round(Math.min(255, Math.max(0, ((data[i] - lo) / range) * 255)));
            data[i] = stretched;
            data[i + 1] = stretched;
            data[i + 2] = stretched;
          }

          // 5. Unsharp mask (sharpening): blend original with blurred version.
          //    We approximate a 3×3 Gaussian blur then subtract it.
          const blurred = new Uint8ClampedArray(data.length);
          const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
          const kernelSum = 16;
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              let sum = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const ny = Math.min(height - 1, Math.max(0, y + ky));
                  const nx = Math.min(width - 1, Math.max(0, x + kx));
                  sum += data[(ny * width + nx) * 4] * kernel[(ky + 1) * 3 + (kx + 1)];
                }
              }
              const idx = (y * width + x) * 4;
              blurred[idx] = sum / kernelSum;
            }
          }
          const SHARPEN_AMOUNT = 1.2;
          for (let i = 0; i < data.length; i += 4) {
            const sharpened = Math.round(Math.min(255, Math.max(0, data[i] + SHARPEN_AMOUNT * (data[i] - blurred[i]))));
            data[i] = sharpened;
            data[i + 1] = sharpened;
            data[i + 2] = sharpened;
          }

          // 6. Local adaptive thresholding (Sauvola-style): threshold each pixel
          //    against the local mean in a window, improving text/bg separation
          //    regardless of uneven lighting.
          const WINDOW = 15; // half-window radius
          const K = 0.15;    // sensitivity constant
          const binarized = new Uint8ClampedArray(data.length);
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              let sum = 0;
              let count = 0;
              for (let wy = -WINDOW; wy <= WINDOW; wy++) {
                for (let wx = -WINDOW; wx <= WINDOW; wx++) {
                  const ny = y + wy;
                  const nx = x + wx;
                  if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                    sum += data[(ny * width + nx) * 4];
                    count++;
                  }
                }
              }
              const mean = sum / count;
              const threshold = mean * (1 - K);
              const idx = (y * width + x) * 4;
              const val = data[idx] >= threshold ? 255 : 0;
              binarized[idx] = val;
              binarized[idx + 1] = val;
              binarized[idx + 2] = val;
              binarized[idx + 3] = 255;
            }
          }
          imageData.data.set(binarized);
          ctx.putImageData(imageData, 0, 0);

          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas toBlob failed"));
          }, "image/png");
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
      img.src = url;
    });
  }

// --- OCR helper for images ---
  async function extractImageText(
    file: File,
    language: LanguageCode,
    options?: {
      shouldCancel?: () => boolean;
      workerRef?: { current: any | null };
    }
  ): Promise<string> {
    const assertNotCancelled = () => {
      if (options?.shouldCancel?.()) {
        throw new UploadCancelledError();
      }
    };

    const ocrLanguage = OCR_LANGUAGE_MAP[language] || "eng";

    let inputFile: File | Blob = file;
    try {
      inputFile = await preprocessImageForOcr(file);
    } catch {
      // If preprocessing fails (unsupported format etc.) fall through to raw input.
      inputFile = file;
    }

    const recognizeWithLanguage = async (lang: string): Promise<string> => {
      assertNotCancelled();
      const worker = await (Tesseract as any).createWorker(lang, 1, {
        logger: () => {},
      });
      options?.workerRef && (options.workerRef.current = worker);

      try {
        assertNotCancelled();
        await worker.setParameters({
          tessedit_pageseg_mode: "3",
          tessedit_ocr_engine_mode: "1",
        } as any);
        const { data: { text } } = await worker.recognize(inputFile);
        assertNotCancelled();
        return text;
      } finally {
        try {
          await worker.terminate();
        } catch {
          // Ignore worker termination errors.
        }
        if (options?.workerRef?.current === worker) {
          options.workerRef.current = null;
        }
      }
    };

    try {
      return await recognizeWithLanguage(ocrLanguage);
    } catch (error) {
      if (isUploadCancelledError(error) || options?.shouldCancel?.()) {
        throw new UploadCancelledError();
      }
      if (ocrLanguage !== "eng") {
        return await recognizeWithLanguage("eng");
      }
      throw error;
    }
  }

export default AIAssistant;
