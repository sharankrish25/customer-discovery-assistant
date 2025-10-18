// Simple test script to verify agents work correctly
const { runAutoAnalysis } = require('./lib/agents.ts');

async function testAgents() {
  console.log('Testing Customer Discovery Agents...\n');
  
  const sampleTranscript = `
    Interviewer: Can you tell me about your current process for managing customer feedback?
    
    Customer: Oh, it's a nightmare honestly. We get feedback from so many places - Slack, email, support tickets, even random conversations. I spend probably 4-5 hours every week just trying to consolidate it all into a spreadsheet.
    
    Interviewer: That sounds time-consuming. What happens when you need to make prioritization decisions?
    
    Customer: Last month we were deciding between two features and I had to go through literally hundreds of messages to get an accurate count. My CEO asked me "How many customers actually want feature X?" and I couldn't give him a straight answer. It was embarrassing.
    
    Interviewer: Have you tried any tools to help with this?
    
    Customer: We tried using a simple form but people still email us directly. I've looked at some tools but they're either too expensive or don't integrate with our existing workflow. Right now I'm just manually copying and pasting everything into Google Sheets.
    
    Interviewer: What would happen if this problem got worse?
    
    Customer: I think we'd start making bad product decisions. We might build features that only a few people want while ignoring the real pain points. It's already happening - we built something last quarter that barely anyone used.
  `;
  
  const productIdea = "AI-powered customer feedback consolidation tool that automatically aggregates feedback from multiple channels and provides actionable insights for product prioritization";
  
  try {
    console.log('Running auto-analysis pipeline...\n');
    const result = await runAutoAnalysis(sampleTranscript, productIdea);
    
    console.log('✅ ANALYSIS COMPLETED SUCCESSFULLY!\n');
    
    console.log('📋 SUMMARY:');
    result.summary.summary.bullets.forEach((bullet, i) => {
      console.log(`  ${i + 1}. ${bullet}`);
    });
    console.log(`  Confidence: ${result.summary.summary.confidence}\n`);
    
    console.log('💡 INSIGHTS:');
    result.insights.insights.forEach((insight, i) => {
      console.log(`  ${i + 1}. ${insight.title} (${insight.type})`);
      console.log(`     Quote: "${insight.quotes[0].text}"`);
      console.log(`     Why it matters: ${insight.why_it_matters}`);
      console.log(`     Evidence level: ${insight.evidence_level}\n`);
    });
    
    console.log('🎯 ALIGNMENT ANALYSIS:');
    console.log(`  Supports (${result.alignment.alignment.supports.length}):`);
    result.alignment.alignment.supports.forEach((item, i) => {
      console.log(`    ${i + 1}. ${item.insight_title}`);
      console.log(`       Quote: "${item.quote}"`);
      console.log(`       Rationale: ${item.rationale}\n`);
    });
    
    console.log(`  Contradicts (${result.alignment.alignment.contradicts.length}):`);
    result.alignment.alignment.contradicts.forEach((item, i) => {
      console.log(`    ${i + 1}. ${item.insight_title}`);
      console.log(`       Quote: "${item.quote}"`);
      console.log(`       Rationale: ${item.rationale}\n`);
    });
    
    console.log(`  Neutral (${result.alignment.alignment.neutral.length}):`);
    result.alignment.alignment.neutral.forEach((item, i) => {
      console.log(`    ${i + 1}. ${item.insight_title}`);
      console.log(`       Rationale: ${item.rationale}\n`);
    });
    
    console.log('🎉 ALL AGENTS WORKING CORRECTLY!');
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testAgents();
}

module.exports = { testAgents };
