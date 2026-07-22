"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form/form-field";
import { createUserSchema, type CreateUserValues } from "../schema";
import { ROLES, ROLE_LABELS } from "../roles";

export function AddUserDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
  });

  async function onSubmit(values: CreateUserValues) {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal membuat pengguna baru");
      return;
    }
    toast.success(`Pengguna "${values.name}" berhasil ditambahkan.`);
    queryClient.invalidateQueries({ queryKey: ["users"] });
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>+ Add User</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Pengguna Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Nama Lengkap" required error={errors.name?.message}>
            <Input placeholder="e.g. Budi Santoso" {...register("name")} />
          </FormField>
          <FormField label="Email" required error={errors.email?.message}>
            <Input type="email" placeholder="budi@verifikasi-impor.local" {...register("email")} />
          </FormField>
          <FormField
            label="Password"
            required
            error={errors.password?.message}
            hint="Minimal 8 karakter."
          >
            <Input type="password" {...register("password")} />
          </FormField>
          <FormField label="Role" required error={errors.role?.message}>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) =>
                        (value && ROLE_LABELS[value as keyof typeof ROLE_LABELS]) ||
                        "Pilih role..."
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
