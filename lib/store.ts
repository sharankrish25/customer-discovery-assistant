import { create } from "zustand";
import type { CustomerProfile, Interview } from "@/types/models";

type NewCustomer = Omit<CustomerProfile, "interviews">;
type NewInterview = Omit<Interview, "customerId">;
type InterviewPatch = Partial<Omit<Interview, "id" | "customerId">>;

interface StoreState {
  customers: CustomerProfile[];
  busyMap: Record<string, boolean>;

  addCustomer: (customer: NewCustomer) => string;
  addInterview: (customerId: string, interview: NewInterview) => string;
  updateInterview: (interviewId: string, patch: InterviewPatch) => void;
  getInterview: (interviewId: string) => Interview | undefined;
  getInterviewsByCustomerId: (customerId: string) => Interview[];
  getCustomerById: (customerId: string) => CustomerProfile | undefined;
  getCustomerByName: (name: string) => CustomerProfile | undefined;

  setBusy: (id: string, busy: boolean) => void;
  isBusy: (id: string) => boolean;

  deleteInterview: (interviewId: string) => void;
  deleteCustomer: (customerId: string) => void;
}

function updateCustomerTimestamp(customer: CustomerProfile): CustomerProfile {
  return { ...customer, updatedAt: new Date() };
}

export const useStore = create<StoreState>((set, get) => ({
  customers: [],
  busyMap: {},

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
      customers: state.customers.map((customer) => {
        if (customer.id !== customerId) {
          return customer;
        }

        return {
          ...updateCustomerTimestamp(customer),
          interviews: [
            ...customer.interviews,
            {
              ...interview,
              customerId,
            },
          ],
        };
      }),
    }));

    return interviewId;
  },

  updateInterview: (interviewId, patch) => {
    set((state) => ({
      customers: state.customers.map((customer) => {
        const hasInterview = customer.interviews.some((i) => i.id === interviewId);
        if (!hasInterview) {
          return customer;
        }

        return {
          ...updateCustomerTimestamp(customer),
          interviews: customer.interviews.map((interview) =>
            interview.id === interviewId
              ? {
                  ...interview,
                  ...patch,
                }
              : interview
          ),
        };
      }),
    }));
  },

  getInterview: (interviewId) => {
    for (const customer of get().customers) {
      const interview = customer.interviews.find((i) => i.id === interviewId);
      if (interview) {
        return interview;
      }
    }
    return undefined;
  },

  getInterviewsByCustomerId: (customerId) => {
    const customer = get().customers.find((c) => c.id === customerId);
    return customer ? customer.interviews : [];
  },

  getCustomerById: (customerId) => get().customers.find((c) => c.id === customerId),

  getCustomerByName: (name) => get().customers.find((c) => c.name === name),

  setBusy: (id, busy) => {
    set((state) => ({
      busyMap: {
        ...state.busyMap,
        [id]: busy,
      },
    }));
  },

  isBusy: (id) => {
    return get().busyMap[id] || false;
  },

  deleteInterview: (interviewId) => {
    set((state) => {
      const customers = state.customers.map((customer) => {
        const filtered = customer.interviews.filter((interview) => interview.id !== interviewId);
        if (filtered.length === customer.interviews.length) {
          return customer;
        }
        return {
          ...customer,
          interviews: filtered,
          updatedAt: new Date(),
        };
      });

      return { customers };
    });
  },

  deleteCustomer: (customerId) => {
    set((state) => ({
      customers: state.customers.filter((customer) => customer.id !== customerId),
    }));
  },
}));
