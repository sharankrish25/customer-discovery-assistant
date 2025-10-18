// Simple test script to verify the API works with the new key
const fetch = require('node-fetch');

async function testAPI() {
  console.log('Testing Customer Discovery API with new Anthropic key...\n');
  
  const sampleTranscript = `
    Interviewer: Can you tell me about your current process for managing customer feedback?
    
    Customer: Oh, it's a nightmare honestly. We get feedback from so many places - Slack, email, support tickets, even random conversations. I spend probably 4-5 hours every week just trying to consolidate it all into a spreadsheet.
    
    Interviewer: That sounds time-consuming. What happens when you need to make prioritization decisions?
    
    Customer: Last month we were deciding between two features and I had to go through literally hundreds of messages to get an accurate count. My CEO asked me "How many customers actually want feature X?" and I couldn't give him a straight answer. It was embarrassing.
    
    Interviewer: Have you tried any tools to help with this?
    
    Customer: We tried using a simple form but people still email us directly. I've looked at some tools but they're either too expensive or don't integrate with our existing workflow. Right now I'm just manually copying and pasting everything into Google Sheets.
  `;
  
  const productIdea = "AI-powered customer feedback consolidation tool that automatically aggregates feedback from multiple channels and provides actionable insights for product prioritization";
  
  try {
    console.log('Making API request to /api/analyze...\n');
    
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interviewId: 'test-123',
        transcript: sampleTranscript,
        productIdea: productIdea
      })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ API REQUEST SUCCESSFUL!\n');
      
      console.log('📋 SUMMARY:');
      if (data.data.summary && data.data.summary.summary) {
        data.data.summary.summary.bullets.forEach((bullet, i) => {
          console.log(`  ${i + 1}. ${bullet}`);
        });
        console.log(`  Confidence: ${data.data.summary.summary.confidence}\n`);
      }
      
      console.log('💡 INSIGHTS:');
      if (data.data.insights && data.data.insights.insights) {
        data.data.insights.insights.forEach((insight, i) => {
          console.log(`  ${i + 1}. ${insight.title} (${insight.type})`);
          if (insight.quotes && insight.quotes.length > 0) {
            console.log(`     Quote: "${insight.quotes[0].text}"`);
          }
          console.log(`     Why it matters: ${insight.why_it_matters}`);
          console.log(`     Evidence level: ${insight.evidence_level}\n`);
        });
      }
      
      console.log('🎯 ALIGNMENT ANALYSIS:');
      if (data.data.alignment && data.data.alignment.alignment) {
        console.log(`  Supports (${data.data.alignment.alignment.supports.length}):`);
        data.data.alignment.alignment.supports.forEach((item, i) => {
          console.log(`    ${i + 1}. ${item.insight_title}`);
          console.log(`       Quote: "${item.quote}"`);
          console.log(`       Rationale: ${item.rationale}\n`);
        });
        
        console.log(`  Contradicts (${data.data.alignment.alignment.contradicts.length}):`);
        data.data.alignment.alignment.contradicts.forEach((item, i) => {
          console.log(`    ${i + 1}. ${item.insight_title}`);
          console.log(`       Quote: "${item.quote}"`);
          console.log(`       Rationale: ${item.rationale}\n`);
        });
        
        console.log(`  Neutral (${data.data.alignment.alignment.neutral.length}):`);
        data.data.alignment.alignment.neutral.forEach((item, i) => {
          console.log(`    ${i + 1}. ${item.insight_title}`);
          console.log(`       Rationale: ${item.rationale}\n`);
        });
      }
      
      console.log('🎉 ALL AGENTS WORKING CORRECTLY WITH NEW API KEY!');
      
    } else {
      console.error('❌ API REQUEST FAILED:', data.error?.message || 'Unknown error');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.log('\nMake sure the development server is running with: npm run dev');
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI };
