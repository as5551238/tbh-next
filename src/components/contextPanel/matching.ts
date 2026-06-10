import { INDUSTRIES, getDepartments } from '@/matrix/data';
import { INDUSTRY_ALIASES, DEPT_KEYWORDS, MULTI_WORD_DEPT_KEYS } from './constants';
import type { ChipOption } from './types';

export function localFallbackMatch(text: string): ChipOption[] {
  const results: ChipOption[] = [];
  const lowerText = text.toLowerCase();

  let detectedIndustry: string | null = null;

  for (const ind of INDUSTRIES) {
    const shortName = ind.replace('行业', '').replace('业', '');
    if (text.includes(shortName) || text.includes(ind)) {
      detectedIndustry = ind;
      break;
    }
  }

  if (!detectedIndustry) {
    for (const [alias, targetInd] of Object.entries(INDUSTRY_ALIASES)) {
      if (text.includes(alias)) {
        detectedIndustry = targetInd;
        break;
      }
    }
  }

  let matchedDept: string | null = null;
  let matchedIndustry: string | null = detectedIndustry;

  for (const [pattern, industry, dept] of MULTI_WORD_DEPT_KEYS) {
    if (text.includes(pattern)) {
      if (detectedIndustry && detectedIndustry !== industry) {
        const depts = getDepartments(detectedIndustry);
        const bestDept = depts.find(d => d.includes('工艺') || d.includes('产品') || d.includes('开发')) ?? depts[0];
        matchedDept = bestDept;
        matchedIndustry = detectedIndustry;
      } else {
        matchedDept = dept;
        matchedIndustry = industry;
      }
      break;
    }
  }

  if (!matchedDept) {
    for (const [kw, val] of Object.entries(DEPT_KEYWORDS)) {
      if (lowerText.includes(kw.toLowerCase())) {
        if (detectedIndustry && detectedIndustry !== val[0]) {
          const depts = getDepartments(detectedIndustry);
          const keywordTopic = val[1];
          const bestDept = depts.find(d =>
            keywordTopic.includes(d.replace(/部$/, '')) ||
            d.includes(keywordTopic.replace(/部$/, ''))
          ) ?? depts[0];
          matchedDept = bestDept;
          matchedIndustry = detectedIndustry;
        } else {
          matchedDept = val[1];
          matchedIndustry = val[0];
        }
        break;
      }
    }
  }

  if (matchedIndustry) {
    const depts = getDepartments(matchedIndustry);
    if (!matchedDept || !depts.includes(matchedDept)) {
      matchedDept = depts[0];
    }
    results.push({
      label: `${matchedIndustry} · ${matchedDept}`,
      industry: matchedIndustry,
      dept: matchedDept!,
      confidence: detectedIndustry === matchedIndustry ? 0.85 : 0.75,
    });
    const otherDepts = depts.filter(d => d !== matchedDept).slice(0, 2);
    for (const alt of otherDepts) {
      results.push({
        label: `${matchedIndustry} · ${alt}`,
        industry: matchedIndustry,
        dept: alt,
        confidence: 0.4,
      });
    }
    return results;
  }

  for (const [kw, val] of Object.entries(DEPT_KEYWORDS)) {
    if (lowerText.includes(kw.toLowerCase())) {
      results.push({ label: `${val[0]} · ${val[1]}`, industry: val[0], dept: val[1], confidence: 0.7 });
      break;
    }
  }

  if (results.length === 0) {
    const industryGuess = text.replace(/我是在|我负责|我做|我是|的.*$/g, '').trim().slice(0, 10);
    if (industryGuess.length >= 2) {
      results.push(
        { label: `${industryGuess} · 业务部`, industry: industryGuess, dept: '业务部', confidence: 0.5, isNew: true },
      );
    }
    results.push(
      { label: 'IT业 · 产品部', industry: 'IT业', dept: '产品部', confidence: 0.4 },
      { label: '制造业 · 生产部', industry: '制造业', dept: '生产部', confidence: 0.3 },
    );
  }

  return results;
}
