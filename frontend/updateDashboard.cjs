const fs = require('fs');
const file = 'c:/Users/HP/disha_BU/frontend/src/pages/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Replace Copilot render
content = content.replace(
  /\{copilotAnswer && \([\s\S]*?<div className="mt-4 rounded-xl bg-emerald-500\/10 border border-emerald-500\/20 p-3 text-xs text-emerald-100">\{copilotAnswer\}<\/div>[\s\S]*?\)\}/,
  `{copilotAnswer && copilotAnswer.analysis && (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4 text-xs text-indigo-100">
                  <h4 className="font-bold text-indigo-300 mb-2">Current Analysis</h4>
                  <p>{copilotAnswer.analysis}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs">
                    <h4 className="font-bold text-emerald-300 mb-2">Strengths</h4>
                    <ul className="list-disc pl-4 space-y-1 text-emerald-100">
                      {copilotAnswer.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs">
                    <h4 className="font-bold text-rose-300 mb-2">Weaknesses & Risks</h4>
                    <ul className="list-disc pl-4 space-y-1 text-rose-100">
                      {[...(copilotAnswer.weaknesses || []), ...(copilotAnswer.risks || [])].map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                </div>
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-100">
                  <h4 className="font-bold text-amber-300 mb-2">Recommendations</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    {copilotAnswer.recommendations?.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                {copilotAnswer.plan?.length > 0 && (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-xs text-slate-300">
                    <h4 className="font-bold text-white mb-2">30-Day Plan</h4>
                    <ul className="space-y-2">
                      {copilotAnswer.plan.map((s, i) => (
                        <li key={i} className="flex gap-2"><span className="text-indigo-400 font-bold">•</span><span>{s}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}`
);

// Copilot History Render fix (since it expects string but now gets object)
content = content.replace(
  /<p className="text-slate-400 mt-1">\{entry\.answer\}<\/p>/g,
  `<p className="text-slate-400 mt-1">{typeof entry.answer === 'string' ? entry.answer : entry.answer?.analysis}</p>`
);

// 2. Readiness Radar render
content = content.replace(
  /<div className="rounded-xl bg-black\/20 border border-white\/10 p-4 text-xs text-slate-300 space-y-2">[\s\S]*?\{readinessData\?\.metrics[\s\S]*?Object\.entries\(readinessData\.metrics\)\.map\(\(\[key, value\]\) => \([\s\S]*?className="flex items-center justify-between gap-2">[\s\S]*?<span>\{key\.replace\(\/\(\[A-Z\]\)\/g, ' \$1'\)\.replace\(\/\^\.\/, \(char\) => char\.toUpperCase\(\)\)\}<\/span>[\s\S]*?<span className="text-emerald-300 font-semibold">[\s\S]*?\{typeof value === 'number' \? \`\$\{value\}\` : String\(value\)\}[\s\S]*?<\/span>[\s\S]*?<\/div>[\s\S]*?\)\)[\s\S]*?: <p className="text-slate-400">Run the readiness analysis to populate your dynamic scoring summary\.<\/p>\}[\s\S]*?<\/div>/,
  `<div className="space-y-3">
              {readinessData?.actionableMetrics
                ? Object.entries(readinessData.actionableMetrics).map(([key, data]) => (
                <div key={key} className="rounded-xl bg-black/20 border border-white/10 p-3 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-emerald-400 font-bold">{data.score}/100</span>
                  </div>
                  <div className="text-slate-400 mb-2"><strong>Why:</strong> {data.why}</div>
                  <div className="text-indigo-300"><strong>How to Improve:</strong>
                    <ul className="list-disc pl-4 mt-1">
                      {data.how?.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </div>
                  <div className="mt-2 text-emerald-400 font-semibold text-[10px]">Impact: {data.impact}</div>
                </div>
                ))
                : <p className="text-xs text-slate-400">Run the readiness analysis to populate your dynamic scoring summary.</p>}
            </div>`
);

// Remove the old next actions section if we embedded it
content = content.replace(
  /<div className="mt-3 rounded-xl bg-white\/5 border border-white\/5 p-3 text-slate-300 text-\[11px\]">[\s\S]*?<div className="flex items-center gap-2 text-slate-200 mb-1"><ShieldCheck className="w-3\.5 h-3\.5" \/> Next actions<\/div>[\s\S]*?\{\(readinessData\?\.suggestions \|\| \[\]\)\.length \? readinessData\.suggestions\.map\(\(item\) => <p key=\{item\} className="mb-1">â€¢ \{item\}<\/p>\) : <p>No suggestions available yet\. Upload a resume or refresh the data to generate them\.<\/p>\}[\s\S]*?<\/div>/,
  ''
);

// 3. Resume Tailoring render
content = content.replace(
  /\{tailorResult && \([\s\S]*?<div className="mt-4 rounded-xl bg-white\/5 border border-white\/5 p-3 text-slate-300 text-\[11px\] space-y-2">[\s\S]*?<div className="font-semibold text-white">Version \{tailorResult\.version\?\.version \|\| 1\}<\/div>[\s\S]*?<p>\{tailorResult\.optimizedSummary \|\| 'Resume tailoring completed with ATS-focused improvements\.'\}<\/p>[\s\S]*?<div className="text-slate-400">[\s\S]*?\{\(tailorResult\.matchingSkills \|\| \[\]\)\.length[\s\S]*?\? \`Matching skills: \$\{tailorResult\.matchingSkills\.join\+', '\)\}\`[\s\S]*?: 'Resume tailored to the target role\.'\}[\s\S]*?<\/div>[\s\S]*?\{\(tailorResult\.missingSkills \|\| \[\]\)\.length > 0 && \([\s\S]*?<div className="text-slate-400">[\s\S]*?Missing skills: \{tailorResult\.missingSkills\.join\+', '\)\}[\s\S]*?<\/div>[\s\S]*?\)\}[\s\S]*?<\/div>[\s\S]*?\)\}/,
  `{tailorResult && tailorResult.matchScore !== undefined && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                  <div className="text-xs text-slate-300">Resume Match Score</div>
                  <div className="text-lg font-bold text-emerald-400">{tailorResult.matchScore}%</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <h4 className="font-bold text-rose-300 mb-1">Missing Keywords</h4>
                    <ul className="list-disc pl-4 text-rose-100">
                      {tailorResult.missingKeywords?.map((k, i) => <li key={i}>{k}</li>)}
                    </ul>
                  </div>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <h4 className="font-bold text-emerald-300 mb-1">Recommended Skills</h4>
                    <ul className="list-disc pl-4 text-emerald-100">
                      {tailorResult.recommendedSkills?.map((k, i) => <li key={i}>{k}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs space-y-2">
                  <h4 className="font-bold text-white">Suggested Summary</h4>
                  <p className="text-slate-300 italic">"{tailorResult.suggestedSummary}"</p>
                </div>

                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs">
                  <h4 className="font-bold text-indigo-300 mb-1">Recruiter Perspective & ATS Tips</h4>
                  <p className="text-indigo-100 mb-2">{tailorResult.recruiterPerspective}</p>
                  <ul className="list-disc pl-4 text-indigo-200">
                    {tailorResult.atsRecommendations?.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              </div>
            )}`
);

// 4. Assessment rendering (Questions)
content = content.replace(
  /\{assessmentQuestions\.map\(\(question\) => \([\s\S]*?<div key=\{question\.id \|\| question\.prompt\} className="rounded-xl bg-black\/20 border border-white\/10 p-3 text-\[11px\] text-slate-300">[\s\S]*?<label className="block text-slate-200 mb-1">\{question\.prompt\}<\/label>[\s\S]*?<textarea value=\{assessmentAnswers\[question\.id \|\| question\.prompt\] \|\| ''\} onChange=\{\(e\) => setAssessmentAnswers\(\(prev\) => \(\{ \.\.\.prev, \[question\.id \|\| question\.prompt\]: e\.target\.value \}\)\)\} className="w-full min-h-\[56px\] rounded-xl bg-white\/5 border border-white\/10 text-slate-100 px-3 py-2 focus:outline-none focus:border-indigo-500\/60" placeholder="Type your answer" \/>[\s\S]*?<\/div>[\s\S]*?\)\}/,
  `{assessmentQuestions.map((question) => (
                  <div key={question.id || question.prompt} className="rounded-xl bg-black/20 border border-white/10 p-4 text-[11px] text-slate-300">
                    <label className="block text-white font-semibold mb-3">{question.prompt}</label>
                    <div className="space-y-2">
                      {question.options?.map((opt, i) => (
                        <label key={i} className="flex items-start gap-2 cursor-pointer p-2 rounded bg-white/5 hover:bg-white/10 transition-colors">
                          <input type="radio" name={question.id} value={opt} className="mt-0.5"
                            checked={assessmentAnswers[question.id]?.answer === opt}
                            onChange={(e) => setAssessmentAnswers(prev => ({ ...prev, [question.id]: { answer: opt, selectedIndex: i } }))}
                          />
                          <span className="leading-tight">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}`
);

// 5. Assessment rendering (Result)
content = content.replace(
  /\{assessmentResult && \([\s\S]*?<div className="mt-4 rounded-xl bg-emerald-500\/10 border border-emerald-500\/20 p-3 text-xs text-emerald-100 space-y-1">[\s\S]*?<div>\{\`Assessment scored \$\{assessmentResult\.score \?\? 0\}\/100\.\`\}<\/div>[\s\S]*?\{\(assessmentResult\.strengths \|\| \[\]\)\.length > 0 && \([\s\S]*?<div className="text-emerald-200">[\s\S]*?Strengths: \{assessmentResult\.strengths\.join\(', '\)\}[\s\S]*?<\/div>[\s\S]*?\)\}[\s\S]*?<\/div>[\s\S]*?\)\}/,
  `{assessmentResult && (
              <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <span className="text-emerald-100 font-bold">Assessment Score</span>
                  <span className="text-lg font-bold text-emerald-400">{assessmentResult.score ?? 0}/100</span>
                </div>
                {assessmentResult.details && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <strong className="text-emerald-300">Strong Areas:</strong>
                        <ul className="list-disc pl-4 text-emerald-100 mt-1 space-y-1">
                          {assessmentResult.details.strengthAreas?.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                      <div>
                        <strong className="text-rose-300">Weak Areas:</strong>
                        <ul className="list-disc pl-4 text-rose-100 mt-1 space-y-1">
                          {assessmentResult.details.weakAreas?.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    </div>
                    <div>
                      <strong className="text-indigo-300">Learning Recommendations:</strong>
                      <ul className="list-disc pl-4 text-indigo-100 mt-1 space-y-1">
                        {assessmentResult.details.learningRecommendations?.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}`
);


fs.writeFileSync(file, content);
console.log('Update complete for StudentDashboard.jsx.');
