"use client";
import { useState, useCallback, useRef } from "react";
import {
  Wand2,
  Image as ImageIcon,
  Video,
  X,
  Loader2,
  Clock,
  Upload,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Slider } from "./ui/slider";
import ImageSelectorModal from "./ImageSelectorModal";
import { generateImage, generateVideo } from "../lib/api";
import {
  getVideoModelAspectRatios,
  getImageModelAspectRatios,
  getImageModelResolutions,
  cn,
} from "../lib/utils";

const VIDEO_MODELS = ["Veo 3.1", "Veo 3.1 Fast", "Veo 3.1 Standard"];
const VIDEO_RESOLUTIONS = ["360p", "540p", "720p", "1080p"];
const IMAGE_MODELS = ["qwen-image", "seedream-4.0"];

export default function PromptInputContainer({ onJobQueued }) {
  const [activeTab, setActiveTab] = useState("image");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageSelectorOpen, setImageSelectorOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // Image settings
  const [imageModel, setImageModel] = useState("qwen-image");
  const [imageQuality, setImageQuality] = useState("720p");
  const [imageRatio, setImageRatio] = useState("1:1");

  // Video settings
  const [videoModel, setVideoModel] = useState("Veo 3.1 Fast");
  const [videoQuality, setVideoQuality] = useState("540p");
  const [videoRatio, setVideoRatio] = useState("16:9");
  const [videoDuration, setVideoDuration] = useState(5);

  const textareaRef = useRef(null);

  const imageResolutions = getImageModelResolutions(imageModel);
  const imageRatios = getImageModelAspectRatios(imageModel);
  const videoRatios = getVideoModelAspectRatios(videoModel);

  function handleImageModelChange(m) {
    setImageModel(m);
    const resolutions = getImageModelResolutions(m);
    if (!resolutions.includes(imageQuality)) setImageQuality(resolutions[0]);
    const ratios = getImageModelAspectRatios(m);
    if (!ratios.includes(imageRatio)) setImageRatio(ratios[0]);
  }

  function handleVideoModelChange(m) {
    setVideoModel(m);
    const ratios = getVideoModelAspectRatios(m);
    if (!ratios.includes(videoRatio)) setVideoRatio(ratios[0]);
  }

  function handleImageSelect(img) {
    setSelectedImage(img);
  }

  function clearImage() {
    setSelectedImage(null);
  }

  function toggleExpand() {
    setExpanded((e) => !e);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }
    setError("");
    setLoading(true);

    try {
      let result;
      if (activeTab === "image") {
        result = await generateImage({
          model: imageModel,
          prompt: prompt.trim(),
          quality: imageQuality,
          aspect_ratio: imageRatio,
          customer_img_path: selectedImage?.path || null,
        });
      } else {
        result = await generateVideo({
          model: videoModel,
          prompt: prompt.trim(),
          quality: videoQuality,
          aspect_ratio: videoRatio,
          duration: videoDuration,
          customer_img_path: selectedImage?.path || null,
        });
      }
      onJobQueued && onJobQueued({
        ...result,
        prompt: prompt.trim(),
        display_model: activeTab === 'image' ? imageModel : videoModel,
        quality: activeTab === 'image' ? imageQuality : videoQuality,
        aspect_ratio: activeTab === 'image' ? imageRatio : (selectedImage ? null : videoRatio),
        duration: activeTab === 'video' ? videoDuration : null,
        mode: activeTab === 'image'
          ? (selectedImage ? 'i2i' : 't2i')
          : (selectedImage ? 'i2v' : 't2v'),
        queue_type: result.queueType || 'image',
      });
      setPrompt("");
      setExpanded(false);
    } catch (err) {
      setError(err.message || "Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const charCount = prompt.length;
  const charLimit = 5000;
  const charOver = charCount > charLimit;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 flex justify-center">
        <div
          className={cn(
            "w-full glass rounded-2xl border border-border shadow-2xl overflow-hidden transition-all duration-300",
            expanded ? "max-w-3xl" : "max-w-2xl",
          )}
        >
          {/* Top bar: Tabs + expand toggle */}
          <div className="px-4 pt-3 pb-0 flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-36">
                <TabsTrigger
                  value="image"
                  className="flex-1 text-xs flex items-center gap-1"
                >
                  <ImageIcon className="w-3 h-3" /> Image
                </TabsTrigger>
                <TabsTrigger
                  value="video"
                  className="flex-1 text-xs flex items-center gap-1"
                >
                  <Video className="w-3 h-3" /> Video
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Expand / collapse prompt area */}
            <button
              onClick={toggleExpand}
              title={expanded ? "Collapse prompt area" : "Expand prompt area"}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              {expanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Image attachment preview */}
          {selectedImage && (
            <div className="px-4 pt-3">
              <div className="relative inline-flex">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage.url}
                  alt="selected"
                  className="h-14 w-14 rounded-lg object-cover border border-border"
                />
                <button
                  onClick={clearImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          )}

          {/* Prompt textarea */}
          <div className="px-4 pt-3 relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                  handleGenerate();
              }}
              placeholder={
                activeTab === "image"
                  ? "Describe the image you want to create…"
                  : "Describe the video you want to generate…"
              }
              className={cn(
                "w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none transition-all duration-300",
                expanded
                  ? "min-h-[120px] max-h-[240px]"
                  : "min-h-[52px] max-h-32",
              )}
              rows={expanded ? 5 : 2}
            />

            {/* Character counter — only show when expanded or near limit */}
            {(expanded || charCount > 600) && (
              <div
                className={cn(
                  "absolute bottom-1 right-5 text-[10px] transition-colors",
                  charOver ? "text-destructive" : "text-muted-foreground/50",
                )}
              >
                {charCount}/{charLimit}
              </div>
            )}
          </div>

          {/* Settings bar */}
          <div className="px-4 pb-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
            {/* Image attach button */}
            <button
              onClick={() => setImageSelectorOpen(true)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors border",
                selectedImage
                  ? "border-primary/50 text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30",
              )}
            >
              <Upload className="w-3.5 h-3.5" />
              {selectedImage ? "Image" : "Attach"}
            </button>

            {activeTab === "image" ? (
              <>
                <Select
                  value={imageModel}
                  onValueChange={handleImageModelChange}
                >
                  <SelectTrigger className="h-7 text-xs border-border w-auto gap-1 px-2.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={imageQuality} onValueChange={setImageQuality}>
                  <SelectTrigger className="h-7 text-xs border-border w-auto gap-1 px-2.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {imageResolutions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={imageRatio} onValueChange={setImageRatio}>
                  <SelectTrigger className="h-7 text-xs border-border w-auto gap-1 px-2.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {imageRatios.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <Select
                  value={videoModel}
                  onValueChange={handleVideoModelChange}
                >
                  <SelectTrigger className="h-7 text-xs border-border w-auto gap-1 px-2.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={videoQuality} onValueChange={setVideoQuality}>
                  <SelectTrigger className="h-7 text-xs border-border w-auto gap-1 px-2.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_RESOLUTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {!selectedImage && (
                  <Select value={videoRatio} onValueChange={setVideoRatio}>
                    <SelectTrigger className="h-7 text-xs border-border w-auto gap-1 px-2.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {videoRatios.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{videoDuration}s</span>
                  <div className="w-20">
                    <Slider
                      min={1}
                      max={15}
                      step={1}
                      value={[videoDuration]}
                      onValueChange={([v]) => setVideoDuration(v)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Generate button */}
            <div className="ml-auto flex items-center gap-2">
              {error && (
                <span className="text-xs text-destructive max-w-[160px] truncate">
                  {error}
                </span>
              )}
              <Button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim() || charOver}
                size="sm"
                className="h-7 px-4 text-xs"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                {loading ? "Queuing…" : "Generate"}
              </Button>
            </div>
          </div>

          {/* Keyboard hint */}
          {expanded && (
            <div className="px-4 pb-2 flex items-center gap-1 text-[10px] text-muted-foreground/40">
              <kbd className="px-1 py-0.5 rounded bg-white/5 font-mono">
                Ctrl+Enter
              </kbd>
              <span>to generate</span>
            </div>
          )}
        </div>
      </div>

      <ImageSelectorModal
        open={imageSelectorOpen}
        onClose={() => setImageSelectorOpen(false)}
        onSelect={handleImageSelect}
      />
    </>
  );
}
