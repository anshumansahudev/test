/* =====================================================================
   LEAF INTRO (opening animation). Runs first, on its own, so the site code
   below can never stop it. It removes itself when finished.
   ===================================================================== */
/*
  Leaf intro – opening only.
  Draws a three-leaf sprig (centre leaf plus one on each side, unfurling), scans it with a beam of light, then splits open along the midrib to reveal whatever page is underneath.
  Events on document:  "leafintro:open"  (split starts)  and  "leafintro:done"  (intro removed).
  API:  LeafIntro.play()  /  LeafIntro.open()
  Script tag options:  data-auto="false" (don't play on load)   data-once="true" (play once per browser session)
  There is no button: when the drawing finishes the leaf splits open by itself (Esc skips ahead).
*/
(function(){
  var tag=document.currentScript;
  var opt=function(k,d){return tag&&tag.dataset[k]!==undefined?tag.dataset[k]:d};
  var gate,isOpen=false,prevOverflow='';

  // ---- the sprig: centre leaf draws first, then both side leaves: upper edges together, then lower edges, then veins ----
  var CL='M180 8 C262 90 282 240 180 330 C78 240 98 90 180 8Z';   // leaf outline, base at (180,330)
  var RE='M180 330 C282 240 262 90 180 8';                        // right edge, base to tip
  var LE='M180 330 C78 240 98 90 180 8';                          // left edge, base to tip
  var K=.65;      // speed: lower is faster, scales every delay and duration
  var SIDE=3.0;                                                   // when the side leaves start (centre leaf is done by then)

  // half-width of the leaf at height y, so every vein can be kept inside the outline
  var EDGE=[];
  for(var q=0;q<=1;q+=.005){var u=1-q;
    EDGE.push([u*u*u*8+3*u*u*q*90+3*u*q*q*240+q*q*q*330, u*u*u*180+3*u*u*q*262+3*u*q*q*282+q*q*q*180]);}
  function hw(y){
    for(var i=1;i<EDGE.length;i++){
      if(EDGE[i][0]>=y){var a=EDGE[i-1],b=EDGE[i],k=(y-a[0])/((b[0]-a[0])||1);return a[1]+(b[1]-a[1])*k-180;}
    }
    return 0;
  }

  function ln(d,delay,dur,cls){
    return '<path '+(cls?'class="'+cls+'" ':'')+'pathLength="1" style="--d:'+(delay*K).toFixed(2)+'s;--t:'+(dur*K).toFixed(2)+'s" d="'+d+'"/>';
  }
  function solid(d,delay,cls){return '<path class="'+cls+'" style="--d:'+(delay*K).toFixed(2)+'s" d="'+d+'"/>'}

  // curved veins that sweep up and out, each ending a few units inside the outline
  function veins(d0,pairs,step,dur){
    var s='';
    for(var i=0;i<pairs;i++){
      var y=78+i*(204/(pairs-1)),ye=y-26,w=hw(ye);
      if(w<16)continue;
      [-1,1].forEach(function(sd){
        s+=ln('M'+(180+sd*4)+' '+y.toFixed(1)+' Q'+(180+sd*w*.35).toFixed(1)+' '+(y-2).toFixed(1)+' '+(180+sd*(w-8)).toFixed(1)+' '+ye.toFixed(1),d0+i*step,dur,'v');
      });
    }
    return s;
  }

  // side leaf: same leaf, smaller, tilted out. Upper edge first, lower edge second, then centre line and veins.
  function side(ang,d0){
    var upper=ang<0?RE:LE,lower=ang<0?LE:RE;
    return '<g transform="translate(180 330) rotate('+ang+') scale(.8) translate(-180 -330)">'+
      '<g class="li-swing" style="--rot:'+(ang<0?28:-28)+'deg;--d:'+(d0*K).toFixed(2)+'s">'+
      solid(CL,d0+1.8,'fill')+
      ln(upper,d0,.9,'o')+ln(lower,d0+.9,.9,'o')+
      ln('M180 330 V8',d0+1.5,1,'')+
      veins(d0+1.7,7,.08,.6)+'</g></g>';
  }
  var centre=solid(CL,0,'occ')+solid(CL,1.6,'fill')+ln(CL,0,2.2,'o')+ln('M180 8 V330',.6,1.4)+
             veins(.9,9,.12,.8)+ln('M180 330 V402',.6,.9);
  var sprig=side(-38,SIDE)+side(38,SIDE)+centre;

  // ---- scan: once the leaf is drawn, a beam of light sweeps down it (only inside the leaf shapes) ----
  var DRAWN=(SIDE+1.7+6*.08+.6)*K;   // seconds until the last vein has drawn
  var SCAN=1;                         // seconds the beam takes to cross the leaf
  function build(id){
    var T1='translate(180 330) rotate(-38) scale(.8) translate(-180 -330)',T2=T1.replace('-38','38');
    var d=DRAWN.toFixed(2),line='style="fill:var(--li-line)"';
    return '<defs>'+
        '<clipPath id="li-c'+id+'"><path d="'+CL+'"/><path transform="'+T1+'" d="'+CL+'"/><path transform="'+T2+'" d="'+CL+'"/></clipPath>'+
        '<linearGradient id="li-g'+id+'" x1="0" y1="0" x2="0" y2="1">'+
          '<stop offset="0" style="stop-color:var(--li-line);stop-opacity:0"/>'+
          '<stop offset="1" style="stop-color:var(--li-line);stop-opacity:.45"/></linearGradient>'+
      '</defs>'+
      sprig+
      '<g clip-path="url(#li-c'+id+')"><g class="li-scan" style="animation-delay:'+d+'s">'+
        '<rect x="-20" y="-80" width="400" height="80" fill="url(#li-g'+id+')"/>'+
        '<rect x="-20" y="-1.5" width="400" height="3" '+line+'/></g></g>'+
      '<g class="li-scan" style="animation-delay:'+d+'s"><rect x="-3000" y="-.5" width="6600" height="1" '+line+' opacity=".25"/></g>';
  }

  function fire(name){document.dispatchEvent(new CustomEvent(name))}

  function play(){
    if(gate)return;
    isOpen=false;
    gate=document.createElement('div');gate.className='li-gate';gate.setAttribute('aria-hidden','true');
    ['l','r'].forEach(function(side){
      var half=document.createElement('div');half.className='li-half '+side;
      half.innerHTML='<div class="li-scene"><svg viewBox="0 0 360 420" role="presentation">'+build(side)+'</svg></div>';
      gate.appendChild(half);
    });
    document.body.appendChild(gate);
    prevOverflow=document.documentElement.style.overflow;
    document.documentElement.style.overflow='hidden';   // no scrolling behind the intro
    // open on its own once the scan has swept the finished leaf
    setTimeout(open,(DRAWN+SCAN+.25)*1000);
  }

  function open(){
    if(!gate||isOpen)return;
    isOpen=true;
    gate.classList.add('open');
    fire('leafintro:open');
    setTimeout(function(){
      gate.remove();gate=null;
      document.documentElement.style.overflow=prevOverflow;
      fire('leafintro:done');
    },1900);
  }

  addEventListener('keydown',function(e){if(e.key==='Escape')open()});
  window.LeafIntro={play:play,open:open};

  function start(){
    if(opt('auto','true')==='false')return;
    if(opt('once','false')==='true'){
      try{if(sessionStorage.getItem('leafintro'))return;sessionStorage.setItem('leafintro','1')}catch(e){}
    }
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){fire('leafintro:done');return}
    play();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();


/* =====================================================================
   PLANTVISION APP
   ===================================================================== */
const input = document.querySelector('#file-input'),
  zone = document.querySelector('#upload-zone'),
  selected = document.querySelector('#selected-file'),
  preview = document.querySelector('#preview'),
  fileName = document.querySelector('#file-name'),
  fileSize = document.querySelector('#file-size'),
  remove = document.querySelector('#remove-file'),
  analyze = document.querySelector('#analyze-button'),
  note = document.querySelector('#upload-note'),
  errorBox = document.querySelector('#error-message'),
  results = document.querySelector('#results'),
  diagnosisPanel = document.querySelector('#diagnosis-panel'),
  languageOptions = document.querySelectorAll('.language-option');
let selectedFile = null;
let language = localStorage.getItem('plantvision-language') || 'en';
const translations = {
  en: { about: 'About', plantApple: 'Apple', plantCorn: 'Corn (maize)', plantGrape: 'Grape', plantBellPepper: 'Bell pepper', plantPotato: 'Potato', plantTomato: 'Tomato', aboutIntro: 'PlantVision combines deep learning, computer vision, and explainable AI to help identify possible leaf diseases.', aiModel: 'AI model', supportedPlants: 'Supported plants', analysis: 'Analysis', deepLearning: 'Deep learning', diseaseClassification: 'Disease classification', computerVision: 'Computer vision', abnormalityEstimation: 'Visual abnormality estimation', explainableAi: 'Explainable AI', attentionMapping: 'Grad-CAM attention mapping', disclaimer: 'PlantVision is an AI-based analysis tool and does not replace professional agricultural diagnosis.', heroTitle: 'See what your plants are trying to tell you.', heroSubtitle: 'Intelligent plant disease detection and visual leaf analysis, powered by deep learning.', analyzeLeaf: 'Analyze a leaf', uploadPrompt: 'Upload a clear image of a supported plant leaf to begin.', dropImage: 'Drag and drop a leaf image here', browseFiles: 'Browse files', chooseImage: 'Choose a clear, well-lit photo of one leaf.', ready: 'Ready to analyze your leaf image.', betterResults: 'How to upload a photo', clearImage: '1. Take a clear, well-lit photo of one supported plant leaf.', inFocus: '2. Drag the photo here or select Browse files.', avoidBlur: '3. Choose a JPG, JPEG, or PNG image up to 10 MB.', supportedSpecies: '4. Check the preview, then select Analyze leaf.', plantHealth: 'Built for plant health', plantHealthText: 'Designed to make early symptoms easier to identify.', explainableResults: 'Explainable results', explainableResultsText: 'Understand which visual features informed each prediction.', fastAnalysis: 'Fast leaf analysis', fastAnalysisText: 'Move from image to actionable context in moments.', analyzing: 'Analyzing…', invalidImage: 'Please choose a JPG, JPEG, or PNG image.', imageTooLarge: 'Please choose an image smaller than 10 MB.', analysisFailed: 'PlantVision analysis failed.', unableAnalysis: 'Unable to analyze this image.', aiDiagnosis: 'AI DIAGNOSIS', confidence: 'confidence', detectedPlant: 'Detected plant', affectedArea: 'Affected area', predictionRanking: 'PREDICTION RANKING', topPredictions: 'Top predictions', visualAnalysis: 'VISUAL LEAF ANALYSIS', regionAnalysis: 'Image-based region analysis', originalLeaf: 'Original leaf', detectedRegion: 'Detected leaf region', abnormalRegions: 'Visually abnormal regions', explainable: 'EXPLAINABLE AI', modelFocus: 'Where the model focused', heatmap: 'AI attention heatmap', overlay: 'Grad-CAM overlay', guidance: 'PLANT HEALTH GUIDANCE', nextSteps: 'Suggested context and next steps', aboutLabel: 'About', signs: 'Common visual signs', steps: 'Suggested next steps', download: 'Download PDF report', generating: 'Generating PDF…' },
  hi: { about: 'जानकारी', plantApple: 'सेब', plantCorn: 'मक्का', plantGrape: 'अंगूर', plantBellPepper: 'शिमला मिर्च', plantPotato: 'आलू', plantTomato: 'टमाटर', aboutIntro: 'PlantVision संभावित पत्ती रोगों की पहचान में सहायता के लिए डीप लर्निंग, कंप्यूटर विज़न और व्याख्यात्मक AI का उपयोग करता है।', aiModel: 'AI मॉडल', supportedPlants: 'समर्थित पौधे', analysis: 'विश्लेषण', deepLearning: 'डीप लर्निंग', diseaseClassification: 'रोग वर्गीकरण', computerVision: 'कंप्यूटर विज़न', abnormalityEstimation: 'दृश्य असामान्यता अनुमान', explainableAi: 'व्याख्यात्मक AI', attentionMapping: 'Grad-CAM ध्यान मानचित्रण', disclaimer: 'PlantVision एक AI-आधारित विश्लेषण उपकरण है और पेशेवर कृषि निदान का विकल्प नहीं है।', heroTitle: 'देखें कि आपके पौधे आपको क्या बताने की कोशिश कर रहे हैं।', heroSubtitle: 'डीप लर्निंग से संचालित बुद्धिमान पौधा रोग पहचान और पत्ती विश्लेषण।', analyzeLeaf: 'पत्ती का विश्लेषण करें', uploadPrompt: 'आरंभ करने के लिए समर्थित पौधे की पत्ती की स्पष्ट तस्वीर अपलोड करें।', dropImage: 'पत्ती की तस्वीर यहाँ खींचकर छोड़ें', browseFiles: 'फ़ाइलें चुनें', chooseImage: 'बेहतर परिणाम के लिए स्पष्ट और अच्छी रोशनी वाली तस्वीर चुनें।', ready: 'आपकी पत्ती की तस्वीर विश्लेषण के लिए तैयार है।', betterResults: 'बेहतर परिणाम के लिए', clearImage: 'स्पष्ट और अच्छी रोशनी वाली पत्ती की तस्वीर लें।', inFocus: 'पत्ती को दिखाई देने योग्य और फोकस में रखें।', avoidBlur: 'बहुत धुंधली या बहुत गहरी तस्वीरों से बचें।', supportedSpecies: 'एक समर्थित पौधे की प्रजाति का उपयोग करें।', plantHealth: 'पौधों के स्वास्थ्य के लिए', plantHealthText: 'शुरुआती लक्षणों की पहचान को आसान बनाने के लिए बनाया गया है।', explainableResults: 'स्पष्ट परिणाम', explainableResultsText: 'समझें कि किन दृश्य विशेषताओं ने प्रत्येक अनुमान को प्रभावित किया।', fastAnalysis: 'तेज़ पत्ती विश्लेषण', fastAnalysisText: 'कुछ ही क्षणों में तस्वीर से उपयोगी जानकारी पाएँ।', analyzing: 'विश्लेषण हो रहा है…', invalidImage: 'कृपया JPG, JPEG या PNG तस्वीर चुनें।', imageTooLarge: 'कृपया 10 MB से छोटी तस्वीर चुनें।', analysisFailed: 'PlantVision विश्लेषण विफल रहा।', unableAnalysis: 'इस तस्वीर का विश्लेषण नहीं हो सका।', aiDiagnosis: 'AI निदान', confidence: 'विश्वास', detectedPlant: 'पहचाना गया पौधा', affectedArea: 'प्रभावित क्षेत्र', predictionRanking: 'पूर्वानुमान रैंकिंग', topPredictions: 'शीर्ष पूर्वानुमान', visualAnalysis: 'दृश्य पत्ती विश्लेषण', regionAnalysis: 'तस्वीर-आधारित क्षेत्र विश्लेषण', originalLeaf: 'मूल पत्ती', detectedRegion: 'पहचाना गया पत्ती क्षेत्र', abnormalRegions: 'दृश्य रूप से असामान्य क्षेत्र', explainable: 'व्याख्यात्मक AI', modelFocus: 'मॉडल ने कहाँ ध्यान दिया', heatmap: 'AI ध्यान हीटमैप', overlay: 'Grad-CAM ओवरले', guidance: 'पौधे की देखभाल मार्गदर्शिका', nextSteps: 'सुझाया गया संदर्भ और अगले कदम', aboutLabel: 'जानकारी', signs: 'सामान्य दृश्य संकेत', steps: 'सुझाए गए अगले कदम', download: 'PDF रिपोर्ट डाउनलोड करें', generating: 'PDF बन रही है…' },
  or: { about: 'ବିଷୟରେ', plantApple: 'ସେଉ', plantCorn: 'ମକା', plantGrape: 'ଅଙ୍ଗୁର', plantBellPepper: 'କ୍ୟାପ୍ସିକମ୍', plantPotato: 'ଆଳୁ', plantTomato: 'ଟମାଟୋ', aboutIntro: 'ସମ୍ଭାବ୍ୟ ପତ୍ର ରୋଗ ଚିହ୍ନଟରେ ସାହାଯ୍ୟ ପାଇଁ PlantVision ଡିପ୍ ଲର୍ନିଂ, କମ୍ପ୍ୟୁଟର ଭିଜନ୍ ଓ ବ୍ୟାଖ୍ୟାଯୋଗ୍ୟ AI ବ୍ୟବହାର କରେ।', aiModel: 'AI ମଡେଲ୍', supportedPlants: 'ସମର୍ଥିତ ଉଦ୍ଭିଦ', analysis: 'ବିଶ୍ଳେଷଣ', deepLearning: 'ଡିପ୍ ଲର୍ନିଂ', diseaseClassification: 'ରୋଗ ବର୍ଗୀକରଣ', computerVision: 'କମ୍ପ୍ୟୁଟର ଭିଜନ୍', abnormalityEstimation: 'ଦୃଶ୍ୟ ଅସ୍ୱାଭାବିକତା ଆକଳନ', explainableAi: 'ବ୍ୟାଖ୍ୟାଯୋଗ୍ୟ AI', attentionMapping: 'Grad-CAM ଧ୍ୟାନ ମାନଚିତ୍ରଣ', disclaimer: 'PlantVision ଏକ AI-ଭିତ୍ତିକ ବିଶ୍ଳେଷଣ ଉପକରଣ; ଏହା ପେଶାଦାର କୃଷି ନିଦାନର ବିକଳ୍ପ ନୁହେଁ।', heroTitle: 'ଆପଣଙ୍କ ଗଛ କ’ଣ କହିବାକୁ ଚେଷ୍ଟା କରୁଛି ଦେଖନ୍ତୁ।', heroSubtitle: 'ଡିପ୍ ଲର୍ନିଂ ଦ୍ୱାରା ଚାଳିତ ବୁଦ୍ଧିମାନ ଉଦ୍ଭିଦ ରୋଗ ଚିହ୍ନଟ ଏବଂ ପତ୍ର ବିଶ୍ଳେଷଣ।', analyzeLeaf: 'ପତ୍ର ବିଶ୍ଳେଷଣ କରନ୍ତୁ', uploadPrompt: 'ଆରମ୍ଭ କରିବା ପାଇଁ ସମର୍ଥିତ ଉଦ୍ଭିଦର ଏକ ସ୍ପଷ୍ଟ ପତ୍ର ଛବି ଅପଲୋଡ୍ କରନ୍ତୁ।', dropImage: 'ପତ୍ର ଛବିକୁ ଏଠାରେ ଡ୍ରାଗ୍ କରି ଛାଡ଼ନ୍ତୁ', browseFiles: 'ଫାଇଲ୍ ବାଛନ୍ତୁ', chooseImage: 'ଭଲ ଫଳାଫଳ ପାଇଁ ସ୍ପଷ୍ଟ ଓ ଭଲ ଆଲୋକର ଛବି ବାଛନ୍ତୁ।', ready: 'ଆପଣଙ୍କ ପତ୍ର ଛବି ବିଶ୍ଳେଷଣ ପାଇଁ ପ୍ରସ୍ତୁତ।', betterResults: 'ଉନ୍ନତ ଫଳାଫଳ ପାଇଁ', clearImage: 'ସ୍ପଷ୍ଟ ଓ ଭଲ ଆଲୋକରେ ପତ୍ର ଛବି ନିଅନ୍ତୁ।', inFocus: 'ପତ୍ରଟି ଦୃଶ୍ୟମାନ ଏବଂ ଫୋକସରେ ରଖନ୍ତୁ।', avoidBlur: 'ଅତ୍ୟଧିକ ଧୂସର କିମ୍ବା ଅନ୍ଧାର ଛବି ଏଡ଼ାନ୍ତୁ।', supportedSpecies: 'ଗୋଟିଏ ସମର୍ଥିତ ଉଦ୍ଭିଦ ପ୍ରଜାତି ବ୍ୟବହାର କରନ୍ତୁ।', plantHealth: 'ଉଦ୍ଭିଦ ସ୍ୱାସ୍ଥ୍ୟ ପାଇଁ', plantHealthText: 'ଆରମ୍ଭିକ ଲକ୍ଷଣ ଚିହ୍ନଟକୁ ସହଜ କରିବା ପାଇଁ ତିଆରି।', explainableResults: 'ବ୍ୟାଖ୍ୟାଯୋଗ୍ୟ ଫଳାଫଳ', explainableResultsText: 'ପ୍ରତ୍ୟେକ ପୂର୍ବାନୁମାନକୁ କେଉଁ ଦୃଶ୍ୟ ବୈଶିଷ୍ଟ୍ୟ ପ୍ରଭାବିତ କରିଛି ଜାଣନ୍ତୁ।', fastAnalysis: 'ଦ୍ରୁତ ପତ୍ର ବିଶ୍ଳେଷଣ', fastAnalysisText: 'କିଛି କ୍ଷଣରେ ଛବିରୁ କାର୍ଯ୍ୟକାରୀ ସୂଚନା ପାଆନ୍ତୁ।', analyzing: 'ବିଶ୍ଳେଷଣ ହେଉଛି…', invalidImage: 'ଦୟାକରି JPG, JPEG କିମ୍ବା PNG ଛବି ବାଛନ୍ତୁ।', imageTooLarge: 'ଦୟାକରି 10 MB ଠାରୁ ଛୋଟ ଛବି ବାଛନ୍ତୁ।', analysisFailed: 'PlantVision ବିଶ୍ଳେଷଣ ବିଫଳ ହେଲା।', unableAnalysis: 'ଏହି ଛବିର ବିଶ୍ଳେଷଣ ହୋଇପାରିଲା ନାହିଁ।', aiDiagnosis: 'AI ନିଦାନ', confidence: 'ବିଶ୍ୱାସ', detectedPlant: 'ଚିହ୍ନଟ ଉଦ୍ଭିଦ', affectedArea: 'ପ୍ରଭାବିତ ଅଞ୍ଚଳ', predictionRanking: 'ପୂର୍ବାନୁମାନ ର୍ୟାଙ୍କିଙ୍ଗ', topPredictions: 'ଶ୍ରେଷ୍ଠ ପୂର୍ବାନୁମାନ', visualAnalysis: 'ଦୃଶ୍ୟ ପତ୍ର ବିଶ୍ଳେଷଣ', regionAnalysis: 'ଛବି-ଆଧାରିତ ଅଞ୍ଚଳ ବିଶ୍ଳେଷଣ', originalLeaf: 'ମୂଳ ପତ୍ର', detectedRegion: 'ଚିହ୍ନଟ ପତ୍ର ଅଞ୍ଚଳ', abnormalRegions: 'ଦୃଶ୍ୟମାନ ଅସ୍ୱାଭାବିକ ଅଞ୍ଚଳ', explainable: 'ବ୍ୟାଖ୍ୟାଯୋଗ୍ୟ AI', modelFocus: 'ମଡେଲ୍ କେଉଁଠି ଧ୍ୟାନ ଦେଲା', heatmap: 'AI ଧ୍ୟାନ ହିଟମ୍ୟାପ୍', overlay: 'Grad-CAM ଓଭରଲେ', guidance: 'ଉଦ୍ଭିଦ ସ୍ୱାସ୍ଥ୍ୟ ମାର୍ଗଦର୍ଶିକା', nextSteps: 'ପ୍ରସ୍ତାବିତ ପରିପ୍ରେକ୍ଷ୍ୟ ଏବଂ ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ', aboutLabel: 'ବିଷୟରେ', signs: 'ସାଧାରଣ ଦୃଶ୍ୟ ସଙ୍କେତ', steps: 'ପ୍ରସ୍ତାବିତ ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ', download: 'PDF ରିପୋର୍ଟ ଡାଉନଲୋଡ୍ କରନ୍ତୁ', generating: 'PDF ତିଆରି ହେଉଛି…' },
  bn: {
  about: 'সম্পর্কে',
  plantApple: 'আপেল',
  plantCorn: 'ভুট্টা',
  plantGrape: 'আঙুর',
  plantBellPepper: 'ক্যাপসিকাম',
  plantPotato: 'আলু',
  plantTomato: 'টমেটো',
  aboutIntro: 'সম্ভাব্য পাতার রোগ শনাক্ত করতে PlantVision ডিপ লার্নিং, কম্পিউটার ভিশন এবং ব্যাখ্যাযোগ্য AI ব্যবহার করে।',
  aiModel: 'AI মডেল',
  supportedPlants: 'সমর্থিত উদ্ভিদ',
  analysis: 'বিশ্লেষণ',
  deepLearning: 'ডিপ লার্নিং',
  diseaseClassification: 'রোগের শ্রেণিবিন্যাস',
  computerVision: 'কম্পিউটার ভিশন',
  abnormalityEstimation: 'দৃশ্যমান অস্বাভাবিকতার আনুমানিক হিসাব',
  explainableAi: 'ব্যাখ্যাযোগ্য AI',
  attentionMapping: 'Grad-CAM মনোযোগ মানচিত্র',
  disclaimer: 'PlantVision একটি AI-ভিত্তিক বিশ্লেষণ সরঞ্জাম; এটি পেশাদার কৃষি রোগ নির্ণয়ের বিকল্প নয়।',
  heroTitle: 'আপনার গাছ কী বলতে চাইছে, তা দেখুন।',
  heroSubtitle: 'ডিপ লার্নিং-চালিত বুদ্ধিমান উদ্ভিদ রোগ শনাক্তকরণ ও পাতার দৃশ্য বিশ্লেষণ।',
  analyzeLeaf: 'পাতা বিশ্লেষণ করুন',
  uploadPrompt: 'শুরু করতে সমর্থিত গাছের পাতার একটি পরিষ্কার ছবি আপলোড করুন।',
  dropImage: 'পাতার ছবি এখানে টেনে এনে ছেড়ে দিন',
  browseFiles: 'ফাইল বেছে নিন',
  chooseImage: 'একটি পাতার পরিষ্কার ও ভালো আলোতে তোলা ছবি বেছে নিন।',
  ready: 'আপনার পাতার ছবি বিশ্লেষণের জন্য প্রস্তুত।',
  betterResults: 'ছবি আপলোড করার নিয়ম',
  clearImage: '১. সমর্থিত গাছের একটি পাতার পরিষ্কার, ভালো আলোতে তোলা ছবি নিন।',
  inFocus: '২. ছবিটি এখানে টেনে আনুন অথবা ফাইল বেছে নিন।',
  avoidBlur: '৩. ১০ MB পর্যন্ত JPG, JPEG অথবা PNG ছবি বেছে নিন।',
  supportedSpecies: '৪. প্রিভিউ দেখে তারপর পাতা বিশ্লেষণ করুন বেছে নিন।',
  plantHealth: 'গাছের সুস্থতার জন্য',
  plantHealthText: 'প্রাথমিক লক্ষণ সহজে শনাক্ত করতে সাহায্য করার জন্য তৈরি।',
  explainableResults: 'ব্যাখ্যাযোগ্য ফলাফল',
  explainableResultsText: 'প্রতিটি পূর্বাভাসে কোন দৃশ্যমান বৈশিষ্ট্য ভূমিকা রেখেছে তা জানুন।',
  fastAnalysis: 'দ্রুত পাতা বিশ্লেষণ',
  fastAnalysisText: 'কয়েক মুহূর্তে ছবি থেকে প্রয়োজনীয় তথ্য পান।',
  analyzing: 'বিশ্লেষণ চলছে…',
  invalidImage: 'অনুগ্রহ করে JPG, JPEG অথবা PNG ছবি বেছে নিন।',
  imageTooLarge: 'অনুগ্রহ করে ১০ MB-এর ছোট ছবি বেছে নিন।',
  analysisFailed: 'PlantVision বিশ্লেষণ ব্যর্থ হয়েছে।',
  unableAnalysis: 'এই ছবিটি বিশ্লেষণ করা যায়নি।',
  aiDiagnosis: 'AI রোগ নির্ণয়',
  confidence: 'নিশ্চয়তা',
  detectedPlant: 'শনাক্ত করা গাছ',
  affectedArea: 'আক্রান্ত এলাকা',
  predictionRanking: 'পূর্বাভাসের ক্রম',
  topPredictions: 'সেরা পূর্বাভাস',
  visualAnalysis: 'পাতার দৃশ্য বিশ্লেষণ',
  regionAnalysis: 'ছবিভিত্তিক অঞ্চল বিশ্লেষণ',
  originalLeaf: 'মূল পাতা',
  detectedRegion: 'শনাক্ত পাতার অংশ',
  abnormalRegions: 'দৃশ্যত অস্বাভাবিক অংশ',
  explainable: 'ব্যাখ্যাযোগ্য AI',
  modelFocus: 'মডেল যে অংশে মনোযোগ দিয়েছে',
  heatmap: 'AI মনোযোগের হিটম্যাপ',
  overlay: 'Grad-CAM ওভারলে',
  guidance: 'গাছের স্বাস্থ্য নির্দেশিকা',
  nextSteps: 'প্রস্তাবিত করণীয় ও পরবর্তী পদক্ষেপ',
  aboutLabel: 'সম্পর্কে',
  signs: 'সাধারণ দৃশ্যমান লক্ষণ',
  steps: 'প্রস্তাবিত পরবর্তী পদক্ষেপ',
  download: 'PDF প্রতিবেদন ডাউনলোড করুন',
  generating: 'PDF তৈরি হচ্ছে…'
}
};
const uploadInstructions = {
  en: {
    chooseImage: 'Choose a clear, well-lit photo of one leaf.',
    betterResults: 'How to upload a photo',
    clearImage: '1. Take a clear, well-lit photo of one supported plant leaf.',
    inFocus: '2. Drag the photo here or select Browse files.',
    avoidBlur: '3. Choose a JPG, JPEG, or PNG image up to 10 MB.',
    supportedSpecies: '4. Check the preview, then select Analyze leaf.'
  },
  hi: {
    chooseImage: 'एक पत्ती की साफ़ और अच्छी रोशनी वाली तस्वीर चुनें।',
    betterResults: 'फोटो कैसे अपलोड करें',
    clearImage: '1. समर्थित पौधे की एक पत्ती की साफ़, अच्छी रोशनी वाली तस्वीर लें।',
    inFocus: '2. तस्वीर को यहाँ खींचें या फ़ाइलें चुनें पर क्लिक करें।',
    avoidBlur: '3. 10 MB तक की JPG, JPEG या PNG तस्वीर चुनें।',
    supportedSpecies: '4. पूर्वावलोकन जाँचें, फिर पत्ती का विश्लेषण करें चुनें।'
  },
  or: {
    chooseImage: 'ଗୋଟିଏ ପତ୍ରର ସ୍ପଷ୍ଟ, ଭଲ ଆଲୋକିତ ଫଟୋ ବାଛନ୍ତୁ।',
    betterResults: 'ଫଟୋ କିପରି ଅପଲୋଡ୍ କରିବେ',
    clearImage: '1. ସମର୍ଥିତ ଉଦ୍ଭିଦର ଗୋଟିଏ ପତ୍ରର ସ୍ପଷ୍ଟ, ଭଲ ଆଲୋକିତ ଫଟୋ ନିଅନ୍ତୁ।',
    inFocus: '2. ଫଟୋଟିକୁ ଏଠାରେ ଡ୍ରାଗ୍ କରନ୍ତୁ କିମ୍ବା ଫାଇଲ୍ ବାଛନ୍ତୁ ଉପରେ କ୍ଲିକ୍ କରନ୍ତୁ।',
    avoidBlur: '3. 10 MB ପର୍ଯ୍ୟନ୍ତ JPG, JPEG କିମ୍ବା PNG ଫଟୋ ବାଛନ୍ତୁ।',
    supportedSpecies: '4. ପ୍ରିଭ୍ୟୁ ଯାଞ୍ଚ କରନ୍ତୁ, ପରେ ପତ୍ର ବିଶ୍ଳେଷଣ କରନ୍ତୁ ଚୟନ କରନ୍ତୁ।'
  },
  bn: {
  chooseImage: 'একটি পাতার পরিষ্কার ও ভালো আলোতে তোলা ছবি বেছে নিন।',
  betterResults: 'ছবি আপলোড করার নিয়ম',
  clearImage: '১. সমর্থিত গাছের একটি পাতার পরিষ্কার, ভালো আলোতে তোলা ছবি নিন।',
  inFocus: '২. ছবিটি এখানে টেনে আনুন অথবা ফাইল বেছে নিন।',
  avoidBlur: '৩. ১০ MB পর্যন্ত JPG, JPEG অথবা PNG ছবি বেছে নিন।',
  supportedSpecies: '৪. প্রিভিউ দেখে তারপর পাতা বিশ্লেষণ করুন বেছে নিন।'
  }
};
const t = key => uploadInstructions[language]?.[key] || translations[language][key] || translations.en[key] || key;
function applyLanguage() {
  document.documentElement.lang = language === 'or' ? 'or' : language;
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n) });
  aboutButton.textContent = '';
  aboutButton.append(document.createTextNode(t('about') + ' '));
  const symbol = document.createElement('span');
  symbol.textContent = aboutContent.classList.contains('hidden') ? '+' : '−';
  aboutButton.append(symbol);
  if (!selectedFile) note.textContent = t('chooseImage');
  showTips();
}
const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
} [c]));
const list = items => (items || []).map(x => `<li>${esc(x)}</li>`).join('') || '<li>Not available.</li>';
const leafIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.2 3.5C12.6 3.8 8.1 6.1 5.9 9.8c-1.9 3.3-1.1 7.7 1.8 9.7.5.4 1.2.1 1.3-.5.5-3.1 2.6-6.3 7-8.7-3.3 2.7-5.1 5.7-5.6 8.9-.1.7.4 1.3 1.1 1.3 4.2.2 7.4-1.6 8.6-5 1.3-3.8.2-8.2.2-10.9 0-.5-.5-1-1.1-1.1Z"/></svg>';

function showTips() {
  diagnosisPanel.innerHTML = `<div class="tips-leaf">${leafIcon}</div><h2>${t('betterResults')}</h2><ul class="tips-list"><li>${t('clearImage')}</li><li>${t('inFocus')}</li><li>${t('avoidBlur')}</li><li>${t('supportedSpecies')}</li></ul>`;
  diagnosisPanel.classList.remove('hidden')
}

showTips();

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden')
}

function setFile(file) {
  errorBox.classList.add('hidden');
  if (!file) {
    selectedFile = null;
    input.value = '';
    selected.classList.add('hidden');
    showTips();
    results.classList.add('hidden');
    analyze.disabled = true;
    note.textContent = t('chooseImage');
    return
  }
  if (!['image/jpeg', 'image/png'].includes(file.type)) return showError(t('invalidImage'));
  if (file.size > 10485760) return showError(t('imageTooLarge'));
  selectedFile = file;
  preview.src = URL.createObjectURL(file);
  fileName.textContent = file.name;
  fileSize.textContent = `${(file.size/1048576).toFixed(2)} MB`;
  selected.classList.remove('hidden');
  analyze.disabled = false;
  note.textContent = t('ready')
}
input.addEventListener('change', () => setFile(input.files[0]));
remove.addEventListener('click', () => setFile(null));
['dragenter', 'dragover'].forEach(e => zone.addEventListener(e, x => {
  x.preventDefault();
  zone.classList.add('dragover')
}));
['dragleave', 'drop'].forEach(e => zone.addEventListener(e, x => {
  x.preventDefault();
  zone.classList.remove('dragover')
}));
zone.addEventListener('drop', e => setFile(e.dataTransfer.files[0]));
analyze.addEventListener('click', async () => {
  if (!selectedFile) return;
  analyze.disabled = true;
  analyze.textContent = t('analyzing');
  errorBox.classList.add('hidden');
  results.classList.add('hidden');
  try {
    const form = new FormData();
    form.append('file', selectedFile);
    const response = await fetch('/predict', {
        method: 'POST',
        body: form
      }),
      data = await response.json();
    if (!response.ok) throw Error(data.detail || t('analysisFailed'));
    render(data);
    results.classList.remove('hidden');
    document.querySelector('.workspace').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  } catch (error) {
    showError(error.message || t('unableAnalysis'))
  } finally {
    analyze.disabled = false;
    analyze.innerHTML = `${t('analyzeLeaf')} <span>→</span>`
  }
});

function render(data) {
  const p = data.prediction,
    v = data.visual_analysis,
    g = data.gradcam,
    h = data.health_guidance;
  diagnosisPanel.innerHTML = `<div class="result-header"><div><span class="eyebrow">${t('aiDiagnosis')}</span><h2 class="prediction-name">${esc(p.disease)}</h2><p class="muted">${esc(p.message)}</p></div><span class="badge">${esc(p.confidence_status)} ${t('confidence')}</span></div><div class="metric-grid"><div class="metric"><span>${t('detectedPlant')}</span><strong>${esc(p.plant)}</strong></div><div class="metric"><span>${t('confidence')}</span><strong>${Number(p.confidence).toFixed(2)}%</strong></div><div class="metric"><span>${t('affectedArea')}</span><strong>${Number(v.affected_percentage).toFixed(2)}%</strong></div></div>`;
  diagnosisPanel.classList.remove('hidden');
  results.innerHTML = `<div class="results-grid"><article class="result-card"><span class="eyebrow">${t('predictionRanking')}</span><h2>${t('topPredictions')}</h2><div class="top-list">${data.top_predictions.map((x,i)=>`<div class="top-item"><div><strong>#${i+1} · ${esc(x.disease)}</strong><small>${esc(x.plant)}</small></div><strong>${Number(x.confidence).toFixed(2)}%</strong></div>`).join('')}</div></article><article class="result-card tips"><div class="tips-leaf">${leafIcon}</div><h2>${t('betterResults')}</h2><ul><li>${t('clearImage')}</li><li>${t('inFocus')}</li><li>${t('avoidBlur')}</li><li>${t('supportedSpecies')}</li></ul></article><article class="result-card full"><span class="eyebrow">${t('visualAnalysis')}</span><h2>${t('regionAnalysis')}</h2><div class="image-grid"><figure><img src="${v.original_image}" alt="${t('originalLeaf')}"><figcaption>${t('originalLeaf')}</figcaption></figure><figure><img src="${v.leaf_mask}" alt="${t('detectedRegion')}"><figcaption>${t('detectedRegion')}</figcaption></figure><figure><img src="${v.affected_mask}" alt="${t('abnormalRegions')}"><figcaption>${t('abnormalRegions')}</figcaption></figure></div><p class="muted">${esc(v.note)}</p></article><article class="result-card full"><span class="eyebrow">${t('explainable')}</span><h2>${t('modelFocus')}</h2><div class="image-grid"><figure><img src="${g.heatmap}" alt="${t('heatmap')}"><figcaption>${t('heatmap')}</figcaption></figure><figure><img src="${g.overlay}" alt="${t('overlay')}"><figcaption>${t('overlay')}</figcaption></figure></div><p class="muted">${esc(g.note)}</p></article><article class="result-card full"><span class="eyebrow">${t('guidance')}</span><h2>${t('nextSteps')}</h2><div class="guidance"><div><h3>${t('aboutLabel')}</h3><p>${esc(h.about)}</p></div><div><h3>${t('signs')}</h3><ul>${list(h.common_visual_signs)}</ul></div><div><h3>${t('steps')}</h3><ul>${list(h.suggested_next_steps)}</ul></div></div><div class="actions"><button id="download-report" class="secondary-action" type="button">${t('download')}</button></div></article></div>`;
  document.querySelector('#download-report').addEventListener('click', download)
}
async function download() {
  const button = document.querySelector('#download-report');
  button.disabled = true;
  button.textContent = t('generating');
  try {
    const form = new FormData();
    form.append('file', selectedFile);
    const response = await fetch('/report', {
      method: 'POST',
      body: form
    });
    if (!response.ok) {
      const data = await response.json();
      throw Error(data.detail || t('download'))
    }
    const url = URL.createObjectURL(await response.blob()),
      link = document.createElement('a');
    link.href = url;
    link.download = 'PlantVision_Analysis_Report.pdf';
    link.click();
    URL.revokeObjectURL(url)
  } catch (error) {
    showError(error.message || t('download'))
  } finally {
    button.disabled = false;
    button.textContent = t('download')
  }
}

const menuButton = document.querySelector('#menu-button'),
  mobileMenu = document.querySelector('#mobile-menu'),
  menuBackdrop = document.querySelector('#menu-backdrop'),
  closeMenu = document.querySelector('#close-menu'),
  languagePicker = document.querySelector('.language-picker'),
  aboutButton = document.querySelector('#about-button'),
  aboutContent = document.querySelector('#about-content');

function setMenu(open) {
  mobileMenu.classList.toggle('hidden', !open);
  menuBackdrop.classList.toggle('hidden', !open);
  menuButton.classList.toggle('hidden', open);
  languagePicker.classList.toggle('hidden', open);
  menuButton.setAttribute('aria-expanded', String(open));
  mobileMenu.setAttribute('aria-hidden', String(!open));

  if (!open) {
    aboutContent.classList.add('hidden');
    aboutButton.setAttribute('aria-expanded', 'false');
    aboutButton.querySelector('span').textContent = '+';
  }

  document.body.style.overflow = open ? 'hidden' : '';
}

if (menuButton) {
  menuButton.addEventListener('click', () => setMenu(true));
  closeMenu.addEventListener('click', () => setMenu(false));
  menuBackdrop.addEventListener('click', () => setMenu(false));
  aboutButton.addEventListener('click', () => {
    const open = aboutContent.classList.toggle('hidden');
    aboutButton.setAttribute('aria-expanded', String(!open));
    aboutButton.querySelector('span').textContent = open ? '+' : '−'
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') setMenu(false)
  })
}

languageOptions.forEach(option => {
  option.classList.toggle('active', option.dataset.language === language);
  option.setAttribute('aria-pressed', String(option.dataset.language === language));
  option.addEventListener('click', () => {
  language = option.dataset.language;
  localStorage.setItem('plantvision-language', language);
  languageOptions.forEach(button => {
    const selected = button.dataset.language === language;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  applyLanguage();
  });
});
applyLanguage();
