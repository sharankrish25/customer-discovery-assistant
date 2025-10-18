import { create } from "zustand";
import type { CustomerProfile, Interview } from "@/types/models";
import type { CoachingOutput, BetterQuestionsOutput, FollowUpEmailOutput } from "@/types/ai";

interface StoreState {
  customers: CustomerProfile[];
  addCustomer: (customer: Omit<CustomerProfile, "interviews">) => string;
  addInterview: (customerId: string, interview: Omit<Interview, "customerId">) => string;
  updateInterview: (interviewId: string, patch: Partial<Interview>) => void;
  updateInterviewAnalysis: (interviewId: string, patch: Partial<Interview>) => void;
  updateInterviewCoaching: (interviewId: string, coaching: CoachingOutput) => void;
  updateInterviewNextQuestions: (interviewId: string, nextQuestions: BetterQuestionsOutput) => void;
  updateInterviewFollowup: (interviewId: string, followup: FollowUpEmailOutput) => void;
  getInterview: (interviewId: string) => Interview | undefined;
  getInterviewById: (interviewId: string) => Interview | undefined;
  getInterviewsByCustomerId: (customerId: string) => Interview[];
  getCustomerById: (customerId: string) => CustomerProfile | undefined;
  getCustomerByName: (name: string) => CustomerProfile | undefined;
  seedMock: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  customers: [],

  addCustomer: (customer) => {
    const customerId = customer.id;
    set((state) => ({
      customers: [
        ...state.customers,
        {
          ...customer,
          interviews: [],
        },
      ],
    }));
    return customerId;
  },

  addInterview: (customerId, interview) => {
    const interviewId = interview.id;
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customerId
          ? {
              ...c,
              updatedAt: new Date(),
              interviews: [
                ...c.interviews,
                {
                  ...interview,
                  customerId,
                },
              ],
            }
          : c
      ),
    }));
    return interviewId;
  },

  updateInterview: (interviewId, patch) => {
    set((state) => ({
      customers: state.customers.map((c) => ({
        ...c,
        interviews: c.interviews.map((i) =>
          i.id === interviewId
            ? {
                ...i,
                ...patch,
              }
            : i
        ),
      })),
    }));
  },

  getInterview: (interviewId) => {
    const state = get();
    for (const customer of state.customers) {
      const interview = customer.interviews.find((i) => i.id === interviewId);
      if (interview) return interview;
    }
    return undefined;
  },

  getInterviewById: (interviewId) => {
    const state = get();
    for (const customer of state.customers) {
      const interview = customer.interviews.find((i) => i.id === interviewId);
      if (interview) return interview;
    }
    return undefined;
  },

  getInterviewsByCustomerId: (customerId) => {
    const state = get();
    const customer = state.customers.find((c) => c.id === customerId);
    return customer ? customer.interviews : [];
  },

  getCustomerById: (customerId) => {
    const state = get();
    return state.customers.find((c) => c.id === customerId);
  },

  getCustomerByName: (name) => {
    const state = get();
    return state.customers.find((c) => c.name === name);
  },

  updateInterviewAnalysis: (interviewId, patch) => {
    get().updateInterview(interviewId, patch);
  },

  updateInterviewCoaching: (interviewId, coaching) => {
    get().updateInterview(interviewId, { coaching });
  },

  updateInterviewNextQuestions: (interviewId, nextQuestions) => {
    get().updateInterview(interviewId, { betterQuestions: nextQuestions });
  },

  updateInterviewFollowup: (interviewId, followup) => {
    get().updateInterview(interviewId, { followUpEmail: followup });
  },

  seedMock: () => {
    const now = new Date();

    const mockCustomers: CustomerProfile[] = [
      {
        id: "cust-001",
        name: "Sarah Chen",
        stakeholderType: "Product Manager",
        demographics: "Tech, 5-10 years PM experience, B2B SaaS",
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        interviews: [
          {
            id: "int-001",
            customerId: "cust-001",
            uploadedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
            transcript: `Interviewer: So, tell me about how you currently manage product feedback?

Sarah: Well, right now it's a bit of a mess honestly. We get feedback from Slack, email, support tickets, sales calls... it's everywhere. I spend probably 3-4 hours a week just trying to consolidate it all into a spreadsheet.

Interviewer: What happened the last time you had to make a prioritization decision?

Sarah: Last month we were deciding between two features. I had to go through literally hundreds of messages across different channels. I made a doc, tagged everything, but I'm sure I missed stuff. The CEO asked me "how many customers asked for X" and I genuinely didn't know the exact number.

Interviewer: How did that make you feel?

Sarah: Frustrated. Like I'm not doing my job well, even though I'm working really hard at it.

Interviewer: If you had a tool that could solve this, what would it look like?

Sarah: I mean, ideally it would just automatically gather everything and categorize it. Show me trends, maybe use AI or something.`,
            productIdea: "AI-powered product feedback aggregator and analysis tool",
            summary: null,
            insights: null,
            alignment: null,
            coaching: null,
            betterQuestions: null,
            followUpEmail: null,
            analysisStatus: "pending",
          },
        ],
      },
      {
        id: "cust-002",
        name: "Marcus Rodriguez",
        stakeholderType: "Engineering Lead",
        demographics: "Startup CTO, 50-person company, fintech",
        createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        interviews: [
          {
            id: "int-002",
            customerId: "cust-002",
            uploadedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
            transcript: `Interviewer: Walk me through your team's deployment process.

Marcus: We deploy about 20 times a week. Each deploy, someone has to manually check our monitoring dashboard, Datadog, PagerDuty, and our internal health checks. Takes about 15 minutes per deploy.

Interviewer: Tell me about a time when that process failed.

Marcus: Two weeks ago we pushed a change that broke our payment processing. The error rate was creeping up slowly - 0.1%, then 0.3%, then 1%. By the time someone noticed in Datadog, we'd lost about $50k in failed transactions.

Interviewer: What did you do about it?

Marcus: We rolled back immediately, but the damage was done. Now I've assigned one engineer to watch every production deploy for the first 30 minutes. That's obviously not scalable.

Interviewer: Would you pay for a solution?

Marcus: I think so? Depends on the price. What features would it have?`,
            productIdea: "Automated deployment monitoring and anomaly detection system",
            summary: null,
            insights: null,
            alignment: null,
            coaching: null,
            betterQuestions: null,
            followUpEmail: null,
            analysisStatus: "pending",
          },
        ],
      },
      {
        id: "cust-003",
        name: "Jennifer Park",
        stakeholderType: "Sales Operations",
        demographics: "Enterprise B2B, 200+ person sales org",
        createdAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        interviews: [
          {
            id: "int-003",
            customerId: "cust-003",
            uploadedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
            transcript: `Interviewer: How do you currently track sales performance?

Jennifer: We use Salesforce primarily, plus a bunch of spreadsheets. The reps hate updating Salesforce, so the data is always stale.

Interviewer: What does your weekly reporting process look like?

Jennifer: I have to export data from three different systems - Salesforce, our call recording platform, and our email tool. Then I spend literally all day Monday creating the exec dashboard. It's manual, error-prone, and by the time I'm done, the data is already outdated.

Interviewer: Describe the last time this caused a real problem.

Jennifer: Last quarter our VP asked mid-quarter "are we going to hit our number?" I told him yes based on my dashboard. We missed by 15% because I didn't see that our enterprise deals were slipping. The data was there, but I didn't have time to dig into it.

Interviewer: How much time do you spend on reporting versus analysis?

Jennifer: Honestly, 80% reporting, 20% analysis. I wish it were flipped. I want to find insights, not just make charts.`,
            productIdea: "Automated sales analytics and forecasting dashboard",
            summary: null,
            insights: null,
            alignment: null,
            coaching: null,
            betterQuestions: null,
            followUpEmail: null,
            analysisStatus: "pending",
          },
        ],
      },
    ];

    set({ customers: mockCustomers });
  },
}));
