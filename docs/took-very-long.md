====================== example patches start

```typescript // src/components/ui/accordion.tsx
"use client"

import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))

AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
```

Next, I'll modify the `DontLetBuyersEscape` component. I will add the necessary imports for the accordion and then wrap the main content of the section within the accordion to make it collapsible.

```typescript // src/components/dont-let-buyers-escape.tsx search-replace
<<<<<<< SEARCH
import { useState, useEffect } from "react"
=======
import { useState, useEffect } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion"
>>>>>>> REPLACE
<<<<<<< SEARCH
        {/* Attention-Grabbing Header */}
        <div className={`mb-16 text-center transition-all duration-1000 ${showStats ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="mx-auto mb-6 w-fit rounded-full bg-gradient-to-r from-red-600 to-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-lg">
            <AlertTriangle className="mr-2 inline size-4 animate-pulse" />
            Masalah Serius!
          </div>

          <h2 className="mx-auto mb-6 max-w-5xl text-4xl font-bold md:text-5xl lg:text-6xl">
            <span className="text-red-400">Jangan Biarkan</span>{" "}
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              Calon Pembeli Kabur
            </span>{" "}
            <span className="text-white">Karena Balasan Lambat</span>
          </h2>

          <p className="mx-auto max-w-3xl text-xl text-slate-300">
            Biarkan JELI yang <span className="font-bold text-green-400">jaga toko</span>,
            <span className="font-bold text-blue-400"> nutup deal</span>, dan
            <span className="font-bold text-purple-400"> masukin uang</span> ke rekening Anda —
            sementara Anda fokus ke produksi, layanan, atau quality time bersama keluarga.
          </p>
        </div>

        {/* Interactive Comparison Widget */}
        <div className="mx-auto mb-16 max-w-6xl">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Without JELI */}
            <div className="rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-900/30 to-red-800/20 p-8 backdrop-blur-sm">
              <div className="mb-6 text-center">
                <TrendingDown className="mx-auto mb-3 size-12 text-red-400" />
                <h3 className="text-2xl font-bold text-red-400">Tanpa JELI</h3>
                <p className="text-red-300">Kondisi bisnis Anda sekarang</p>
              </div>

              {/* Animated Lost Deals Counter */}
              <div className="mb-6 text-center">
                <div className="rounded-2xl border border-red-500/40 bg-red-900/40 p-6">
                  <div className="text-4xl font-bold text-red-400">{lostDeals}%</div>
                  <div className="text-sm text-red-300">Customer kabur karena respons lambat</div>
                </div>
              </div>

              {/* Problem Points */}
              <div className="space-y-4">
                {problemPoints.map((problem, index) => {
                  const Icon = problem.icon
                  return (
                    <div key={index} className="flex items-start gap-4 rounded-xl border border-red-500/20 bg-red-900/20 p-4">
                      <Icon className="mt-1 size-6 text-red-400" />
                      <div>
                        <h4 className="font-semibold text-red-300">{problem.title}</h4>
                        <p className="text-sm text-red-200/80">{problem.description}</p>
                        <div className="mt-1 text-xs font-semibold text-red-400">💸 {problem.impact}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* With JELI */}
            <div className={`rounded-3xl border border-green-500/30 bg-gradient-to-br from-green-900/30 to-green-800/20 p-8 backdrop-blur-sm transition-all duration-1000 ${isAnimating ? 'scale-105 shadow-2xl shadow-green-500/20' : ''}`}>
              <div className="mb-6 text-center">
                <TrendingUp className="mx-auto mb-3 size-12 text-green-400" />
                <h3 className="text-2xl font-bold text-green-400">Dengan JELI</h3>
                <p className="text-green-300">Transformasi bisnis Anda</p>
              </div>

              {/* Animated Success Counter */}
              <div className="mb-6 text-center">
                <div className="rounded-2xl border border-green-500/40 bg-green-900/40 p-6">
                  <div className="text-4xl font-bold text-green-400">{savedDeals}%</div>
                  <div className="text-sm text-green-300">Deal berhasil ditutup otomatis</div>
                </div>
              </div>

              {/* Solution Points */}
              <div className="space-y-4">
                {solutions.map((solution, index) => {
                  const Icon = solution.icon
                  return (
                    <div key={index} className="flex items-start gap-4 rounded-xl border border-green-500/20 bg-green-900/20 p-4">
                      <Icon className="mt-1 size-6 text-green-400" />
                      <div>
                        <h4 className="font-semibold text-green-300">{solution.title}</h4>
                        <p className="text-sm text-green-200/80">{solution.description}</p>
                        <div className="mt-1 text-xs font-semibold text-green-400">📈 {solution.result}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* VS Indicator */}
          <div className="relative -mt-4 flex justify-center">
            <div className="rounded-full border-4 border-slate-800 bg-gradient-to-r from-red-500 to-green-500 px-6 py-2 font-bold text-white shadow-xl">
              VS
            </div>
          </div>
        </div>

        {/* Interactive Revenue Calculator */}
        <div className="mx-auto mb-16 max-w-4xl rounded-3xl border border-slate-700 bg-slate-800/50 p-8 backdrop-blur-sm">
          <h3 className="mb-6 text-center text-2xl font-bold text-white">
            💰 Kalkulator Kerugian Realtime
          </h3>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-2 text-sm text-slate-400">Customer per hari yang chat</div>
              <div className="text-3xl font-bold text-blue-400">25</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-sm text-slate-400">Rata-rata nilai transaksi</div>
              <div className="text-3xl font-bold text-purple-400">Rp 150K</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-sm text-slate-400">Close rate tanpa JELI</div>
              <div className="text-3xl font-bold text-red-400">35%</div>
            </div>
          </div>

          <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>

          <div className="text-center">
            <div className="mb-4">
              <div className="text-sm text-slate-400">Potensi revenue yang hilang per bulan:</div>
              <div className="text-4xl font-bold text-red-400">Rp 11.250.000</div>
            </div>

            <div className="rounded-xl border border-green-500/30 bg-green-900/20 p-4">
              <div className="text-sm text-green-300">Dengan JELI (85% close rate):</div>
              <div className="text-3xl font-bold text-green-400">+Rp 18.750.000</div>
              <div className="text-xs text-green-200">Selisih: +Rp 30 juta per bulan!</div>
            </div>
          </div>
        </div>

        {/* Live Chat Simulation */}
        <div className="mx-auto mb-16 max-w-4xl">
          <h3 className="mb-8 text-center text-2xl font-bold text-white">
            🔥 Simulasi Live: Sebelum vs Sesudah JELI
          </h3>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Before JELI Chat */}
            <div className="rounded-2xl border border-red-500/30 bg-slate-800/50 p-6">
              <div className="mb-4 text-center text-lg font-semibold text-red-400">
                ❌ Tanpa JELI
              </div>

              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-xs rounded-2xl bg-green-600 px-4 py-2 text-white">
                    <p className="text-sm">Halo, ada diskon gak untuk skincare set?</p>
                    <div className="text-xs opacity-75">14:20</div>
                  </div>
                </div>

                <div className="text-center text-xs text-slate-500">CS offline...</div>
                <div className="text-center text-xs text-slate-500">Customer menunggu 2 jam...</div>

                <div className="flex justify-start">
                  <div className="max-w-xs rounded-2xl bg-slate-700 px-4 py-2 text-white">
                    <p className="text-sm">Maaf baru balas, ada kok. Mau yang mana?</p>
                    <div className="text-xs opacity-75">16:45</div>
                  </div>
                </div>

                <div className="text-center text-xs text-red-400">Customer sudah beli di toko lain 😭</div>
              </div>
            </div>

            {/* After JELI Chat */}
            <div className="rounded-2xl border border-green-500/30 bg-slate-800/50 p-6">
              <div className="mb-4 text-center text-lg font-semibold text-green-400">
                ✅ Dengan JELI
              </div>

              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-xs rounded-2xl bg-green-600 px-4 py-2 text-white">
                    <p className="text-sm">Halo, ada diskon gak untuk skincare set?</p>
                    <div className="text-xs opacity-75">14:20</div>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="max-w-xs rounded-2xl bg-blue-600 px-4 py-2 text-white">
                    <p className="text-sm">Halo Kak! Ada dong 🔥 Kebetulan hari ini flash sale 40% off untuk skincare set premium. Cocok banget buat kulit kombinasi seperti kakak!</p>
                    <div className="text-xs opacity-75">14:20 (7 detik)</div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="max-w-xs rounded-2xl bg-green-600 px-4 py-2 text-white">
                    <p className="text-sm">Wah iya! Gimana cara ordernya?</p>
                    <div className="text-xs opacity-75">14:21</div>
                  </div>
                </div>

                <div className="text-center text-xs text-green-400">Deal closed! 💰 Rp 270.000</div>
              </div>
            </div>
          </div>
        </div>

        {/* Strong CTA Section */}
        <div className="text-center">
          <div className="mx-auto mb-8 max-w-3xl rounded-3xl border border-yellow-500/30 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 p-8">
            <h3 className="mb-4 text-3xl font-bold text-yellow-400">
              🚨 Slot Terbatas: 5 Klien Baru Hari Ini
            </h3>

            <p className="mb-6 text-lg text-slate-300">
              Jangan biarkan kompetitor Anda duluan pakai JELI.
              Setiap hari yang terlewat = ribuan rupiah yang hilang.
            </p>

            <Button
              size="lg"
              className="mb-4 w-full animate-pulse rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-red-600 px-8 py-6 text-xl font-bold text-white transition-transform duration-300 hover:scale-105 md:w-auto"
            >
              <MessageCircle className="mr-3 size-6" />
              Mulai Trial Gratis Sekarang — Slot Terbatas!
              <ArrowRight className="ml-3 size-6" />
            </Button>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-500" />
                Setup 15 menit
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-500" />
                Gratis 3 hari
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-500" />
                Cancel kapan saja
              </div>
            </div>
          </div>

          <div className="text-center">
            <h4 className="mb-4 text-2xl font-bold text-white">
              <span className="text-green-400">Tutup lebih banyak deal</span> — tanpa tambah staf. Tanpa ribet.
            </h4>

            <p className="mx-auto max-w-2xl text-lg text-slate-400">
              JELI bekerja 24/7, tidak pernah lelah, tidak pernah lupa follow-up, dan selalu closing-oriented.
              Saatnya bisnis Anda naik level.
            </p>
          </div>
        </div>
=======
        {/* Attention-Grabbing Header */}
        <div className={`mb-8 text-center transition-all duration-1000 ${showStats ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="mx-auto mb-6 w-fit rounded-full bg-gradient-to-r from-red-600 to-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-lg">
            <AlertTriangle className="mr-2 inline size-4 animate-pulse" />
            Masalah Serius!
          </div>

          <h2 className="mx-auto mb-6 max-w-5xl text-4xl font-bold md:text-5xl lg:text-6xl">
            <span className="text-red-400">Jangan Biarkan</span>{" "}
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              Calon Pembeli Kabur
            </span>{" "}
            <span className="text-white">Karena Balasan Lambat</span>
          </h2>

          <p className="mx-auto max-w-3xl text-xl text-slate-300">
            Biarkan JELI yang <span className="font-bold text-green-400">jaga toko</span>,
            <span className="font-bold text-blue-400"> nutup deal</span>, dan
            <span className="font-bold text-purple-400"> masukin uang</span> ke rekening Anda —
            sementara Anda fokus ke produksi, layanan, atau quality time bersama keluarga.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger className="mx-auto mb-16 w-fit flex-none cursor-pointer justify-center rounded-full border border-slate-700 bg-slate-800/50 px-8 py-4 text-center text-lg font-semibold text-white no-underline backdrop-blur-sm transition-all hover:bg-slate-800/80 hover:no-underline">
              Lihat Bukti Nyata: Sebelum vs Sesudah JELI
            </AccordionTrigger>
            <AccordionContent>
              {/* Interactive Comparison Widget */}
              <div className="mx-auto mb-16 max-w-6xl">
                <div className="grid gap-8 md:grid-cols-2">
                  {/* Without JELI */}
                  <div className="rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-900/30 to-red-800/20 p-8 backdrop-blur-sm">
                    <div className="mb-6 text-center">
                      <TrendingDown className="mx-auto mb-3 size-12 text-red-400" />
                      <h3 className="text-2xl font-bold text-red-400">Tanpa JELI</h3>
                      <p className="text-red-300">Kondisi bisnis Anda sekarang</p>
                    </div>

                    {/* Animated Lost Deals Counter */}
                    <div className="mb-6 text-center">
                      <div className="rounded-2xl border border-red-500/40 bg-red-900/40 p-6">
                        <div className="text-4xl font-bold text-red-400">{lostDeals}%</div>
                        <div className="text-sm text-red-300">Customer kabur karena respons lambat</div>
                      </div>
                    </div>

                    {/* Problem Points */}
                    <div className="space-y-4">
                      {problemPoints.map((problem, index) => {
                        const Icon = problem.icon
                        return (
                          <div key={index} className="flex items-start gap-4 rounded-xl border border-red-500/20 bg-red-900/20 p-4">
                            <Icon className="mt-1 size-6 text-red-400" />
                            <div>
                              <h4 className="font-semibold text-red-300">{problem.title}</h4>
                              <p className="text-sm text-red-200/80">{problem.description}</p>
                              <div className="mt-1 text-xs font-semibold text-red-400">💸 {problem.impact}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* With JELI */}
                  <div className={`rounded-3xl border border-green-500/30 bg-gradient-to-br from-green-900/30 to-green-800/20 p-8 backdrop-blur-sm transition-all duration-1000 ${isAnimating ? 'scale-105 shadow-2xl shadow-green-500/20' : ''}`}>
                    <div className="mb-6 text-center">
                      <TrendingUp className="mx-auto mb-3 size-12 text-green-400" />
                      <h3 className="text-2xl font-bold text-green-400">Dengan JELI</h3>
                      <p className="text-green-300">Transformasi bisnis Anda</p>
                    </div>

                    {/* Animated Success Counter */}
                    <div className="mb-6 text-center">
                      <div className="rounded-2xl border border-green-500/40 bg-green-900/40 p-6">
                        <div className="text-4xl font-bold text-green-400">{savedDeals}%</div>
                        <div className="text-sm text-green-300">Deal berhasil ditutup otomatis</div>
                      </div>
                    </div>

                    {/* Solution Points */}
                    <div className="space-y-4">
                      {solutions.map((solution, index) => {
                        const Icon = solution.icon
                        return (
                          <div key={index} className="flex items-start gap-4 rounded-xl border border-green-500/20 bg-green-900/20 p-4">
                            <Icon className="mt-1 size-6 text-green-400" />
                            <div>
                              <h4 className="font-semibold text-green-300">{solution.title}</h4>
                              <p className="text-sm text-green-200/80">{solution.description}</p>
                              <div className="mt-1 text-xs font-semibold text-green-400">📈 {solution.result}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* VS Indicator */}
                <div className="relative -mt-4 flex justify-center">
                  <div className="rounded-full border-4 border-slate-800 bg-gradient-to-r from-red-500 to-green-500 px-6 py-2 font-bold text-white shadow-xl">
                    VS
                  </div>
                </div>
              </div>

              {/* Interactive Revenue Calculator */}
              <div className="mx-auto mb-16 max-w-4xl rounded-3xl border border-slate-700 bg-slate-800/50 p-8 backdrop-blur-sm">
                <h3 className="mb-6 text-center text-2xl font-bold text-white">
                  💰 Kalkulator Kerugian Realtime
                </h3>

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center">
                    <div className="mb-2 text-sm text-slate-400">Customer per hari yang chat</div>
                    <div className="text-3xl font-bold text-blue-400">25</div>
                  </div>
                  <div className="text-center">
                    <div className="mb-2 text-sm text-slate-400">Rata-rata nilai transaksi</div>
                    <div className="text-3xl font-bold text-purple-400">Rp 150K</div>
                  </div>
                  <div className="text-center">
                    <div className="mb-2 text-sm text-slate-400">Close rate tanpa JELI</div>
                    <div className="text-3xl font-bold text-red-400">35%</div>
                  </div>
                </div>

                <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>

                <div className="text-center">
                  <div className="mb-4">
                    <div className="text-sm text-slate-400">Potensi revenue yang hilang per bulan:</div>
                    <div className="text-4xl font-bold text-red-400">Rp 11.250.000</div>
                  </div>

                  <div className="rounded-xl border border-green-500/30 bg-green-900/20 p-4">
                    <div className="text-sm text-green-300">Dengan JELI (85% close rate):</div>
                    <div className="text-3xl font-bold text-green-400">+Rp 18.750.000</div>
                    <div className="text-xs text-green-200">Selisih: +Rp 30 juta per bulan!</div>
                  </div>
                </div>
              </div>

              {/* Live Chat Simulation */}
              <div className="mx-auto mb-16 max-w-4xl">
                <h3 className="mb-8 text-center text-2xl font-bold text-white">
                  🔥 Simulasi Live: Sebelum vs Sesudah JELI
                </h3>

                <div className="grid gap-8 md:grid-cols-2">
                  {/* Before JELI Chat */}
                  <div className="rounded-2xl border border-red-500/30 bg-slate-800/50 p-6">
                    <div className="mb-4 text-center text-lg font-semibold text-red-400">
                      ❌ Tanpa JELI
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <div className="max-w-xs rounded-2xl bg-green-600 px-4 py-2 text-white">
                          <p className="text-sm">Halo, ada diskon gak untuk skincare set?</p>
                          <div className="text-xs opacity-75">14:20</div>
                        </div>
                      </div>

                      <div className="text-center text-xs text-slate-500">CS offline...</div>
                      <div className="text-center text-xs text-slate-500">Customer menunggu 2 jam...</div>

                      <div className="flex justify-start">
                        <div className="max-w-xs rounded-2xl bg-slate-700 px-4 py-2 text-white">
                          <p className="text-sm">Maaf baru balas, ada kok. Mau yang mana?</p>
                          <div className="text-xs opacity-75">16:45</div>
                        </div>
                      </div>

                      <div className="text-center text-xs text-red-400">Customer sudah beli di toko lain 😭</div>
                    </div>
                  </div>

                  {/* After JELI Chat */}
                  <div className="rounded-2xl border border-green-500/30 bg-slate-800/50 p-6">
                    <div className="mb-4 text-center text-lg font-semibold text-green-400">
                      ✅ Dengan JELI
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <div className="max-w-xs rounded-2xl bg-green-600 px-4 py-2 text-white">
                          <p className="text-sm">Halo, ada diskon gak untuk skincare set?</p>
                          <div className="text-xs opacity-75">14:20</div>
                        </div>
                      </div>

                      <div className="flex justify-start">
                        <div className="max-w-xs rounded-2xl bg-blue-600 px-4 py-2 text-white">
                          <p className="text-sm">Halo Kak! Ada dong 🔥 Kebetulan hari ini flash sale 40% off untuk skincare set premium. Cocok banget buat kulit kombinasi seperti kakak!</p>
                          <div className="text-xs opacity-75">14:20 (7 detik)</div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <div className="max-w-xs rounded-2xl bg-green-600 px-4 py-2 text-white">
                          <p className="text-sm">Wah iya! Gimana cara ordernya?</p>
                          <div className="text-xs opacity-75">14:21</div>
                        </div>
                      </div>

                      <div className="text-center text-xs text-green-400">Deal closed! 💰 Rp 270.000</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strong CTA Section */}
              <div className="text-center">
                <div className="mx-auto mb-8 max-w-3xl rounded-3xl border border-yellow-500/30 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 p-8">
                  <h3 className="mb-4 text-3xl font-bold text-yellow-400">
                    🚨 Slot Terbatas: 5 Klien Baru Hari Ini
                  </h3>

                  <p className="mb-6 text-lg text-slate-300">
                    Jangan biarkan kompetitor Anda duluan pakai JELI.
                    Setiap hari yang terlewat = ribuan rupiah yang hilang.
                  </p>

                  <Button
                    size="lg"
                    className="mb-4 w-full animate-pulse rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-red-600 px-8 py-6 text-xl font-bold text-white transition-transform duration-300 hover:scale-105 md:w-auto"
                  >
                    <MessageCircle className="mr-3 size-6" />
                    Mulai Trial Gratis Sekarang — Slot Terbatas!
                    <ArrowRight className="ml-3 size-6" />
                  </Button>

                  <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="size-4 text-green-500" />
                      Setup 15 menit
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="size-4 text-green-500" />
                      Gratis 3 hari
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="size-4 text-green-500" />
                      Cancel kapan saja
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <h4 className="mb-4 text-2xl font-bold text-white">
                    <span className="text-green-400">Tutup lebih banyak deal</span> — tanpa tambah staf. Tanpa ribet.
                  </h4>

                  <p className="mx-auto max-w-2xl text-lg text-slate-400">
                    JELI bekerja 24/7, tidak pernah lelah, tidak pernah lupa follow-up, dan selalu closing-oriented.
                    Saatnya bisnis Anda naik level.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
>>>>>>> REPLACE
```

Finally, I'll update the `Header` component. The state will be changed to track the visibility of the pricing section, and the logic in the `useEffect` hooks will be updated to control when the notification bar is displayed.

```typescript // src/components/header.tsx search-replace
<<<<<<< SEARCH
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [showNotification, setShowNotification] = useState(true)
  const [headerTheme, setHeaderTheme] = useState<'dark' | 'light'>('dark')
=======
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isPricingVisible, setIsPricingVisible] = useState(false)
  const [isNotificationDismissed, setIsNotificationDismissed] = useState(false)
  const [headerTheme, setHeaderTheme] = useState<'dark' | 'light'>('dark')
>>>>>>> REPLACE
<<<<<<< SEARCH
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      setIsScrolled(scrollY > 10)

      const sections = Array.from(document.querySelectorAll('[data-section]')) as HTMLElement[]
      if (sections.length === 0) return

      const headerHeight = 80 // Approximate height of header for offset
      const triggerPoint = scrollY + headerHeight

      let currentSection = sections.find(section => {
        const sectionTop = section.offsetTop
        const sectionBottom = sectionTop + section.offsetHeight
        return triggerPoint >= sectionTop && triggerPoint < sectionBottom
      })

      if (!currentSection) {
        if (triggerPoint < sections[0].offsetTop) {
          currentSection = sections[0]
        } else {
          // It might be in a gap or after the last section
          // Find the last section that is above the trigger point
          const passedSections = sections.filter(s => s.offsetTop < triggerPoint)
          currentSection = passedSections[passedSections.length - 1]
        }
      }

      if (currentSection) {
        const theme = currentSection.dataset.theme
        setHeaderTheme(theme === 'light' || theme === 'gray' ? 'light' : 'dark')
      }
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll)
    window.addEventListener("resize", handleScroll)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
    }
  }, [])

  useEffect(() => {
    const updateNotificationHeight = () => {
      if (showNotification && notificationRef.current) {
        setNotificationHeight(notificationRef.current.offsetHeight);
      } else {
        setNotificationHeight(0);
      }
    };

    // Initial calculation
    updateNotificationHeight();

    // Update on resize
    window.addEventListener('resize', updateNotificationHeight);

    // For good measure, a ResizeObserver in case content changes cause height change
    const observer = new ResizeObserver(updateNotificationHeight);
    if (notificationRef.current) observer.observe(notificationRef.current);

    return () => {
      window.removeEventListener('resize', updateNotificationHeight);
      if (notificationRef.current) observer.unobserve(notificationRef.current);
    };
  }, [showNotification]);
=======
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      setIsScrolled(scrollY > 10)

      const sections = Array.from(document.querySelectorAll('[data-section]')) as HTMLElement[]
      if (sections.length === 0) return

      const headerHeight = 80 // Approximate height of header for offset
      const triggerPoint = scrollY + headerHeight

      let currentSection = sections.find(section => {
        const sectionTop = section.offsetTop
        const sectionBottom = sectionTop + section.offsetHeight
        return triggerPoint >= sectionTop && triggerPoint < sectionBottom
      })

      if (!currentSection) {
        if (triggerPoint < sections[0].offsetTop) {
          currentSection = sections[0]
        } else {
          // It might be in a gap or after the last section
          // Find the last section that is above the trigger point
          const passedSections = sections.filter(s => s.offsetTop < triggerPoint)
          currentSection = passedSections[passedSections.length - 1]
        }
      }

      if (currentSection) {
        const theme = currentSection.dataset.theme
        setHeaderTheme(theme === 'light' || theme === 'gray' ? 'light' : 'dark')
      }
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleScroll)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
    }
  }, [])

  useEffect(() => {
    const pricingSection = document.getElementById('pricing')
    if (!pricingSection) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPricingVisible(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    observer.observe(pricingSection)

    return () => {
      if (pricingSection) {
        observer.unobserve(pricingSection)
      }
    }
  }, [])

  const showNotification = isPricingVisible && !isNotificationDismissed

  useEffect(() => {
    const updateNotificationHeight = () => {
      if (showNotification && notificationRef.current) {
        setNotificationHeight(notificationRef.current.offsetHeight);
      } else {
        setNotificationHeight(0);
      }
    };

    // Initial calculation
    updateNotificationHeight();

    // Update on resize
    window.addEventListener('resize', updateNotificationHeight);

    // For good measure, a ResizeObserver in case content changes cause height change
    const observer = new ResizeObserver(updateNotificationHeight);
    if (notificationRef.current) observer.observe(notificationRef.current);

    return () => {
      window.removeEventListener('resize', updateNotificationHeight);
      if (notificationRef.current) observer.unobserve(notificationRef.current);
    };
  }, [showNotification]);
>>>>>>> REPLACE
<<<<<<< SEARCH
            🔥 Flash Sale: 50% OFF untuk 5 klien pertama hari ini!
            <button
              onClick={() => setShowNotification(false)}
              className="ml-4 text-white/80 hover:text-white"
            >
=======
            🔥 Flash Sale: 50% OFF untuk 5 klien pertama hari ini!
            <button
              onClick={() => setIsNotificationDismissed(true)}
              className="ml-4 text-white/80 hover:text-white"
            >
>>>>>>> REPLACE
```

---
```yaml
projectId: jeli-landing-web
uuid: 44095813-90d2-4cfb-8bb5-532e8d975344
changeSummary:
  - new: src/components/ui/accordion.tsx
  - edit: src/components/dont-let-buyers-escape.tsx
  - edit: src/components/header.tsx
promptSummary: >-
  The user wants to make two changes: 1. The notification top bar in the Header
  component should only appear when the user scrolls down to the pricing
  section. 2. The 'Masalah Serius!' section in the DontLetBuyersEscape component
  should be collapsible using an accordion to make it less lengthy on initial
  view.
gitCommitMsg: >-
  feat: Enhance UX with conditional notification and collapsible section

  - Makes the top notification bar in the header appear only when the pricing
  section is in the viewport, reducing initial visual clutter.

  - Implements a collapsible accordion for the "Masalah Serius!" section in
  DontLetBuyersEscape, improving page scanability by hiding detailed content
  by default.

  - Adds a new reusable accordion UI component.
```




Here are the modifications to implement the requested changes.

First, I'll create the `accordion.tsx` component, which is a standard UI component that will be used in the `DontLetBuyersEscape` section. This is based on shadcn/ui's accordion.

```typescript // src/components/ui/accordion.tsx
"use client"

import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))

AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
```



```typescript // src/components/dont-let-buyers-escape.tsx standard-diff
--- src/components/dont-let-buyers-escape.tsx
+++ src/components/dont-let-buyers-escape.tsx
@@ -1,6 +1,12 @@
 import { Button } from "./ui/button"
 import { MessageCircle, Clock, TrendingDown, TrendingUp, AlertTriangle, Zap, DollarSign, Users, ArrowRight, CheckCircle, Target } from "lucide-react"
 import { useState, useEffect } from "react"
+import {
+  Accordion,
+  AccordionContent,
+  AccordionItem,
+  AccordionTrigger,
+} from "./ui/accordion"

 export function DontLetBuyersEscape() {
   const [showStats, setShowStats] = useState(false)
@@ -83,7 +89,7 @@
   return (
     <section data-section="escape" data-theme="dark" className="relative z-1 overflow-hidden bg-transparent py-20 lg:py-32 text-white">
       <div className="container relative z-10 mx-auto px-4">
         {/* Attention-Grabbing Header */}
-        <div className={`mb-16 text-center transition-all duration-1000 ${showStats ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
+        <div className={`mb-8 text-center transition-all duration-1000 ${showStats ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
           <div className="mx-auto mb-6 w-fit rounded-full bg-gradient-to-r from-red-600 to-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-lg">
             <AlertTriangle className="mr-2 inline size-4 animate-pulse" />
             Masalah Serius!
@@ -107,243 +113,253 @@
           </p>
         </div>

-        {/* Interactive Comparison Widget */}
-        <div className="mx-auto mb-16 max-w-6xl">
-          <div className="grid gap-8 md:grid-cols-2">
-            {/* Without JELI */}
-            <div className="rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-900/30 to-red-800/20 p-8 backdrop-blur-sm">
-              <div className="mb-6 text-center">
-                <TrendingDown className="mx-auto mb-3 size-12 text-red-400" />
-                <h3 className="text-2xl font-bold text-red-400">Tanpa JELI</h3>
-                <p className="text-red-300">Kondisi bisnis Anda sekarang</p>
-              </div>
-
-              {/* Animated Lost Deals Counter */}
-              <div className="mb-6 text-center">
-                <div className="rounded-2xl border border-red-500/40 bg-red-900/40 p-6">
-                  <div className="text-4xl font-bold text-red-400">{lostDeals}%</div>
-                  <div className="text-sm text-red-300">Customer kabur karena respons lambat</div>
-                </div>
-              </div>
-
-              {/* Problem Points */}
-              <div className="space-y-4">
-                {problemPoints.map((problem, index) => {
-                  const Icon = problem.icon
-                  return (
-                    <div key={index} className="flex items-start gap-4 rounded-xl border border-red-500/20 bg-red-900/20 p-4">
-                      <Icon className="mt-1 size-6 text-red-400" />
-                      <div>
-                        <h4 className="font-semibold text-red-300">{problem.title}</h4>
-                        <p className="text-sm text-red-200/80">{problem.description}</p>
-                        <div className="mt-1 text-xs font-semibold text-red-400">💸 {problem.impact}</div>
-                      </div>
-                    </div>
-                  )
-                })}
-              </div>
-            </div>
-
-            {/* With JELI */}
-            <div className={`rounded-3xl border border-green-500/30 bg-gradient-to-br from-green-900/30 to-green-800/20 p-8 backdrop-blur-sm transition-all duration-1000 ${isAnimating ? 'scale-105 shadow-2xl shadow-green-500/20' : ''}`}>
-              <div className="mb-6 text-center">
-                <TrendingUp className="mx-auto mb-3 size-12 text-green-400" />
-                <h3 className="text-2xl font-bold text-green-400">Dengan JELI</h3>
-                <p className="text-green-300">Transformasi bisnis Anda</p>
-              </div>
-
-              {/* Animated Success Counter */}
-              <div className="mb-6 text-center">
-                <div className="rounded-2xl border border-green-500/40 bg-green-900/40 p-6">
-                  <div className="text-4xl font-bold text-green-400">{savedDeals}%</div>
-                  <div className="text-sm text-green-300">Deal berhasil ditutup otomatis</div>
-                </div>
-              </div>
-
-              {/* Solution Points */}
-              <div className="space-y-4">
-                {solutions.map((solution, index) => {
-                  const Icon = solution.icon
-                  return (
-                    <div key={index} className="flex items-start gap-4 rounded-xl border border-green-500/20 bg-green-900/20 p-4">
-                      <Icon className="mt-1 size-6 text-green-400" />
-                      <div>
-                        <h4 className="font-semibold text-green-300">{solution.title}</h4>
-                        <p className="text-sm text-green-200/80">{solution.description}</p>
-                        <div className="mt-1 text-xs font-semibold text-green-400">📈 {solution.result}</div>
-                      </div>
-                    </div>
-                  )
-                })}
-              </div>
-            </div>
-          </div>
-
-          {/* VS Indicator */}
-          <div className="relative -mt-4 flex justify-center">
-            <div className="rounded-full border-4 border-slate-800 bg-gradient-to-r from-red-500 to-green-500 px-6 py-2 font-bold text-white shadow-xl">
-              VS
-            </div>
-          </div>
-        </div>
-
-        {/* Interactive Revenue Calculator */}
-        <div className="mx-auto mb-16 max-w-4xl rounded-3xl border border-slate-700 bg-slate-800/50 p-8 backdrop-blur-sm">
-          <h3 className="mb-6 text-center text-2xl font-bold text-white">
-            💰 Kalkulator Kerugian Realtime
-          </h3>
-
-          <div className="grid gap-6 md:grid-cols-3">
-            <div className="text-center">
-              <div className="mb-2 text-sm text-slate-400">Customer per hari yang chat</div>
-              <div className="text-3xl font-bold text-blue-400">25</div>
-            </div>
-            <div className="text-center">
-              <div className="mb-2 text-sm text-slate-400">Rata-rata nilai transaksi</div>
-              <div className="text-3xl font-bold text-purple-400">Rp 150K</div>
-            </div>
-            <div className="text-center">
-              <div className="mb-2 text-sm text-slate-400">Close rate tanpa JELI</div>
-              <div className="text-3xl font-bold text-red-400">35%</div>
-            </div>
-          </div>
-
-          <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
-
-          <div className="text-center">
-            <div className="mb-4">
-              <div className="text-sm text-slate-400">Potensi revenue yang hilang per bulan:</div>
-              <div className="text-4xl font-bold text-red-400">Rp 11.250.000</div>
-            </div>
-
-            <div className="rounded-xl border border-green-500/30 bg-green-900/20 p-4">
-              <div className="text-sm text-green-300">Dengan JELI (85% close rate):</div>
-              <div className="text-3xl font-bold text-green-400">+Rp 18.750.000</div>
-              <div className="text-xs text-green-200">Selisih: +Rp 30 juta per bulan!</div>
-            </div>
-          </div>
-        </div>
-
-        {/* Live Chat Simulation */}
-        <div className="mx-auto mb-16 max-w-4xl">
-          <h3 className="mb-8 text-center text-2xl font-bold text-white">
-            🔥 Simulasi Live: Sebelum vs Sesudah JELI
-          </h3>
-
-          <div className="grid gap-8 md:grid-cols-2">
-            {/* Before JELI Chat */}
-            <div className="rounded-2xl border border-red-500/30 bg-slate-800/50 p-6">
-              <div className="mb-4 text-center text-lg font-semibold text-red-400">
-                ❌ Tanpa JELI
-              </div>
-
-              <div className="space-y-3">
-                <div className="flex justify-end">
-                  <div className="max-w-xs rounded-2xl bg-green-600 px-4 py-2 text-white">
-                    <p className="text-sm">Halo, ada diskon gak untuk skincare set?</p>
-                    <div className="text-xs opacity-75">14:20</div>
-                  </div>
-                </div>
-
-                <div className="text-center text-xs text-slate-500">CS offline...</div>
-                <div className="text-center text-xs text-slate-500">Customer menunggu 2 jam...</div>
-
-                <div className="flex justify-start">
-                  <div className="max-w-xs rounded-2xl bg-slate-700 px-4 py-2 text-white">
-                    <p className="text-sm">Maaf baru balas, ada kok. Mau yang mana?</p>
-                    <div className="text-xs opacity-75">16:45</div>
-                  </div>
-                </div>
-
-                <div className="text-center text-xs text-red-400">Customer sudah beli di toko lain 😭</div>
-              </div>
-            </div>
-
-            {/* After JELI Chat */}
-            <div className="rounded-2xl border border-green-500/30 bg-slate-800/50 p-6">
-              <div className="mb-4 text-center text-lg font-semibold text-green-400">
-                ✅ Dengan JELI
-              </div>
-
-              <div className="space-y-3">
-                <div className="flex justify-end">
-                  <div className="max-w-xs rounded-2xl bg-green-600 px-4 py-2 text-white">
-                    <p className="text-sm">Halo, ada diskon gak untuk skincare set?</p>
-                    <div className="text-xs opacity-75">14:20</div>
-                  </div>
-                </div>
-
-                <div className="flex justify-start">
-                  <div className="max-w-xs rounded-2xl bg-blue-600 px-4 py-2 text-white">
-                    <p className="text-sm">Halo Kak! Ada dong 🔥 Kebetulan hari ini flash sale 40% off untuk skincare set premium. Cocok banget buat kulit kombinasi seperti kakak!</p>
-                    <div className="text-xs opacity-75">14:20 (7 detik)</div>
-                  </div>
-                </div>
-
-                <div className="flex justify-end">
-                  <div className="max-w-xs rounded-2xl bg-green-600 px-4 py-2 text-white">
-                    <p className="text-sm">Wah iya! Gimana cara ordernya?</p>
-                    <div className="text-xs opacity-75">14:21</div>
-                  </div>
-                </div>
-
-                <div className="text-center text-xs text-green-400">Deal closed! 💰 Rp 270.000</div>
-              </div>
-            </div>
-          </div>
-        </div>
-
-        {/* Strong CTA Section */}
-        <div className="text-center">
-          <div className="mx-auto mb-8 max-w-3xl rounded-3xl border border-yellow-500/30 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 p-8">
-            <h3 className="mb-4 text-3xl font-bold text-yellow-400">
-              🚨 Slot Terbatas: 5 Klien Baru Hari Ini
-            </h3>
-
-            <p className="mb-6 text-lg text-slate-300">
-              Jangan biarkan kompetitor Anda duluan pakai JELI.
-              Setiap hari yang terlewat = ribuan rupiah yang hilang.
-            </p>
-
-            <Button
-              size="lg"
-              className="mb-4 w-full animate-pulse rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-red-600 px-8 py-6 text-xl font-bold text-white transition-transform duration-300 hover:scale-105 md:w-auto"
-            >
-              <MessageCircle className="mr-3 size-6" />
-              Mulai Trial Gratis Sekarang — Slot Terbatas!
-              <ArrowRight className="ml-3 size-6" />
-            </Button>
-
-            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
-              <div className="flex items-center gap-2">
-                <CheckCircle className="size-4 text-green-500" />
-                Setup 15 menit
-              </div>
-              <div className="flex items-center gap-2">
-                <CheckCircle className="size-4 text-green-500" />
-                Gratis 3 hari
-              </div>
-              <div className="flex items-center gap-2">
-                <CheckCircle className="size-4 text-green-500" />
-                Cancel kapan saja
-              </div>
-            </div>
-          </div>
-
-          <div className="text-center">
-            <h4 className="mb-4 text-2xl font-bold text-white">
-              <span className="text-green-400">Tutup lebih banyak deal</span> — tanpa tambah staf. Tanpa ribet.
-            </h4>
-
-            <p className="mx-auto max-w-2xl text-lg text-slate-400">
-              JELI bekerja 24/7, tidak pernah lelah, tidak pernah lupa follow-up, dan selalu closing-oriented.
-              Saatnya bisnis Anda naik level.
-            </p>
-          </div>
-        </div>
+        <Accordion type="single" collapsible className="w-full">
+          <AccordionItem value="item-1" className="border-none">
+            <AccordionTrigger className="mx-auto mb-16 w-fit flex-none cursor-pointer justify-center rounded-full border border-slate-700 bg-slate-800/50 px-8 py-4 text-center text-lg font-semibold text-white no-underline backdrop-blur-sm transition-all hover:bg-slate-800/80 hover:no-underline">
+              Lihat Bukti Nyata: Sebelum vs Sesudah JELI
+            </AccordionTrigger>
+            <AccordionContent>
+              {/* Interactive Comparison Widget */}
+              <div className="mx-auto mb-16 max-w-6xl">
+                <div className="grid gap-8 md:grid-cols-2">
+                  {/* Without JELI */}
+                  <div className="rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-900/30 to-red-800/20 p-8 backdrop-blur-sm">
+                    <div className="mb-6 text-center">
+                      <TrendingDown className="mx-auto mb-3 size-12 text-red-400" />
+                      <h3 className="text-2xl font-bold text-red-400">Tanpa JELI</h3>
+                      <p className="text-red-300">Kondisi bisnis Anda sekarang</p>
+                    </div>
+
+                    {/* Animated Lost Deals Counter */}
+                    <div className="mb-6 text-center">
+                      <div className="rounded-2xl border border-red-500/40 bg-red-900/40 p-6">
+                        <div className="text-4xl font-bold text-red-400">{lostDeals}%</div>
+                        <div className="text-sm text-red-300">Customer kabur karena respons lambat</div>
+                      </div>
+                    </div>
+
+                    {/* Problem Points */}
+                    <div className="space-y-4">
+                      {problemPoints.map((problem, index) => {
+                        const Icon = problem.icon
+                        return (
+                          <div key={index} className="flex items-start gap-4 rounded-xl border border-red-500/20 bg-red-900/20 p-4">
+                            <Icon className="mt-1 size-6 text-red-400" />
+                            <div>
+                              <h4 className="font-semibold text-red-300">{problem.title}</h4>
+                              <p className="text-sm text-red-200/80">{problem.description}</p>
+                              <div className="mt-1 text-xs font-semibold text-red-400">💸 {problem.impact}</div>
+                            </div>
+                          </div>
+                        )
+                      })}
+                    </div>
+                  </div>
+
+                  {/* With JELI */}
+                  <div className={`rounded-3xl border border-green-500/30 bg-gradient-to-br from-green-900/30 to-green-800/20 p-8 backdrop-blur-sm transition-all duration-1000 ${isAnimating ? 'scale-105 shadow-2xl shadow-green-500/20' : ''}`}>
+                    <div className="mb-6 text-center">
+                      <TrendingUp className="mx-auto mb-3 size-12 text-green-400" />
+                      <h3 className="text-2xl font-bold text-green-400">Dengan JELI</h3>
+                      <p className="text-green-300">Transformasi bisnis Anda</p>
+                    </div>
+
+                    {/* Animated Success Counter */}
+                    <div className="mb-6 text-center">
+                      <div className="rounded-2xl border border-green-500/40 bg-green-900/40 p-6">
+                        <div className="text-4xl font-bold text-green-400">{savedDeals}%</div>
+                        <div className="text-sm text-green-300">Deal berhasil ditutup otomatis</div>
+                      </div>
+                    </div>
+
+                    {/* Solution Points */}
+                    <div className="space-y-4">
+                      {solutions.map((solution, index) => {
+                        const Icon = solution.icon
+                        return (
+                          <div key={index} className="flex items-start gap-4 rounded-xl border border-green-500/20 bg-green-900/20 p-4">
+                            <Icon className="mt-1 size-6 text-green-400" />
+                            <div>
+                              <h4 className="font-semibold text-green-300">{solution.title}</h4>
+                              <p className="text-sm text-green-200/80">{solution.description}</p>
+                              <div className="mt-1 text-xs font-semibold text-green-400">📈 {solution.result}</div>
+                            </div>
+                          </div>
+                        )
+                      })}
+                    </div>
+                  </div>
+                </div>
+
+                {/* VS Indicator */}
+                <div className="relative -mt-4 flex justify-center">
+                  <div className="rounded-full border-4 border-slate-800 bg-gradient-to-r from-red-500 to-green-500 px-6 py-2 font-bold text-white shadow-xl">
+                    VS
+                  </div>
+                </div>
+              </div>
+
+              {/* Interactive Revenue Calculator */}
+              <div className="mx-auto mb-16 max-w-4xl rounded-3xl border border-slate-700 bg-slate-800/50 p-8 backdrop-blur-sm">
+                <h3 className="mb-6 text-center text-2xl font-bold text-white">
+                  💰 Kalkulator Kerugian Realtime
+                </h3>
+
+                <div className="grid gap-6 md:grid-cols-3">
+                  <div className="text-center">
+                    <div className="mb-2 text-sm text-slate-400">Customer per hari yang chat</div>
+                    <div className="text-3xl font-bold text-blue-400">25</div>
+                  </div>
+                  <div className="text-center">
+                    <div className="mb-2 text-sm text-slate-400">Rata-rata nilai transaksi</div>
+                    <div className="text-3xl font-bold text-purple-400">Rp 150K</div>
+                  </div>
+                  <div className="text-center">
+                    <div className="mb-2 text-sm text-slate-400">Close rate tanpa JELI</div>
+                    <div className="text-3xl font-bold text-red-400">35%</div>
+                  </div>
+                </div>
+
+                <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
+
+                <div className="text-center">
+                  <div className="mb-4">
+                    <div className="text-sm text-slate-400">Potensi revenue yang hilang per bulan:</div>
+                    <div className="text-4xl font-bold text-red-400">Rp 11.250.000</div>
+                  </div>
+
+                  <div className="rounded-xl border border-green-500/30 bg-green-900/20 p-4">
+                    <div className="text-sm text-green-300">Dengan JELI (85% close rate):</div>
+                    <div className="text-3xl font-bold text-green-400">+Rp 18.750.000</div>
+                    <div className="text-xs text-green-200">Selisih: +Rp 30 juta per bulan!</div>
+                  </div>
+                </div>
+              </div>
+
+              {/* Live Chat Simulation */}
+              <div className="mx-auto mb-16 max-w-4xl">
+                <h3 className="mb-8 text-center text-2xl font-bold text-white">
+                  🔥 Simulasi Live: Sebelum vs Sesudah JELI
+                </h3>
+
+                <div className="grid gap-8 md:grid-cols-2">
+                  {/* Before JELI Chat */}
+                  <div className="rounded-2xl border border-red-500/30 bg-slate-800/50 p-6">
+                    <div className="mb-4 text-center text-lg font-semibold text-red-400">
+                      ❌ Tanpa JELI
+                    </div>
+
+                    <div className="space-y-3">
+                      <div className="flex justify-end">
+                        <div className="max-w-xs rounded-2xl bg-green-600 px-4 py-2 text-white">
+                          <p className="text-sm">Halo, ada diskon gak untuk skincare set?</p>
+                          <div className="text-xs opacity-75">14:20</div>
+                        </div>
+                      </div>
+
+                      <div className="text-center text-xs text-slate-500">CS offline...</div>
+                      <div className="text-center text-xs text-slate-500">Customer menunggu 2 jam...</div>
+
+                      <div className="flex justify-start">
+                        <div className="max-w-xs rounded-2xl bg-slate-700 px-4 py-2 text-white">
+                          <p className="text-sm">Maaf baru balas, ada kok. Mau yang mana?</p>
+                          <div className="text-xs opacity-75">16:45</div>
+                        </div>
+                      </div>
+
+                      <div className="text-center text-xs text-red-400">Customer sudah beli di toko lain 😭</div>
+                    </div>
+                  </div>
+
+                  {/* After JELI Chat */}
+                  <div className="rounded-2xl border border-green-500/30 bg-slate-800/50 p-6">
+                    <div className="mb-4 text-center text-lg font-semibold text-green-400">
+                      ✅ Dengan JELI
+                    </div>
+
+                    <div className="space-y-3">
+                      <div className="flex justify-end">
+                        <div className="max-w-xs rounded-2xl bg-green-600 px-4 py-2 text-white">
+                          <p className="text-sm">Halo, ada diskon gak untuk skincare set?</p>
+                          <div className="text-xs opacity-75">14:20</div>
+                        </div>
+                      </div>
+
+                      <div className="flex justify-start">
+                        <div className="max-w-xs rounded-2xl bg-blue-600 px-4 py-2 text-white">
+                          <p className="text-sm">Halo Kak! Ada dong 🔥 Kebetulan hari ini flash sale 40% off untuk skincare set premium. Cocok banget buat kulit kombinasi seperti kakak!</p>
+                          <div className="text-xs opacity-75">14:20 (7 detik)</div>
+                        </div>
+                      </div>
+
+                      <div className="flex justify-end">
+                        <div className="max-w-xs rounded-2xl bg-green-600 px-4 py-2 text-white">
+                          <p className="text-sm">Wah iya! Gimana cara ordernya?</p>
+                          <div className="text-xs opacity-75">14:21</div>
+                        </div>
+                      </div>
+
+                      <div className="text-center text-xs text-green-400">Deal closed! 💰 Rp 270.000</div>
+                    </div>
+                  </div>
+                </div>
+              </div>
+
+              {/* Strong CTA Section */}
+              <div className="text-center">
+                <div className="mx-auto mb-8 max-w-3xl rounded-3xl border border-yellow-500/30 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 p-8">
+                  <h3 className="mb-4 text-3xl font-bold text-yellow-400">
+                    🚨 Slot Terbatas: 5 Klien Baru Hari Ini
+                  </h3>
+
+                  <p className="mb-6 text-lg text-slate-300">
+                    Jangan biarkan kompetitor Anda duluan pakai JELI.
+                    Setiap hari yang terlewat = ribuan rupiah yang hilang.
+                  </p>
+
+                  <Button
+                    size="lg"
+                    className="mb-4 w-full animate-pulse rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-red-600 px-8 py-6 text-xl font-bold text-white transition-transform duration-300 hover:scale-105 md:w-auto"
+                  >
+                    <MessageCircle className="mr-3 size-6" />
+                    Mulai Trial Gratis Sekarang — Slot Terbatas!
+                    <ArrowRight className="ml-3 size-6" />
+                  </Button>
+
+                  <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
+                    <div className="flex items-center gap-2">
+                      <CheckCircle className="size-4 text-green-500" />
+                      Setup 15 menit
+                    </div>
+                    <div className="flex items-center gap-2">
+                      <CheckCircle className="size-4 text-green-500" />
+                      Gratis 3 hari
+                    </div>
+                    <div className="flex items-center gap-2">
+                      <CheckCircle className="size-4 text-green-500" />
+                      Cancel kapan saja
+                    </div>
+                  </div>
+                </div>
+
+                <div className="text-center">
+                  <h4 className="mb-4 text-2xl font-bold text-white">
+                    <span className="text-green-400">Tutup lebih banyak deal</span> — tanpa tambah staf. Tanpa ribet.
+                  </h4>
+
+                  <p className="mx-auto max-w-2xl text-lg text-slate-400">
+                    JELI bekerja 24/7, tidak pernah lelah, tidak pernah lupa follow-up, dan selalu closing-oriented.
+                    Saatnya bisnis Anda naik level.
+                  </p>
+                </div>
+              </div>
+            </AccordionContent>
+          </AccordionItem>
+        </Accordion>
       </div>
     </section>
   )
 }
```

Finally, I'll update the `Header` component to only show the notification bar when the pricing section is visible.

```typescript // src/components/header.tsx standard-diff
--- src/components/header.tsx
+++ src/components/header.tsx
@@ -7,7 +7,8 @@
 export function Header() {
   const [isMenuOpen, setIsMenuOpen] = useState(false)
   const [isScrolled, setIsScrolled] = useState(false)
-  const [showNotification, setShowNotification] = useState(true)
+  const [isPricingVisible, setIsPricingVisible] = useState(false)
+  const [isNotificationDismissed, setIsNotificationDismissed] = useState(false)
   const [headerTheme, setHeaderTheme] = useState<'dark' | 'light'>('dark')
   const notificationRef = useRef<HTMLDivElement>(null)
   const [notificationHeight, setNotificationHeight] = useState(0)
@@ -43,21 +44,43 @@
       }
     }
     handleScroll()
-    window.addEventListener("scroll", handleScroll)
+    window.addEventListener("scroll", handleScroll, { passive: true })
     window.addEventListener("resize", handleScroll)

     return () => {
       window.removeEventListener("scroll", handleScroll)
       window.removeEventListener("resize", handleScroll)
     }
   }, [])

+  useEffect(() => {
+    const pricingSection = document.getElementById('pricing')
+    if (!pricingSection) return
+
+    const observer = new IntersectionObserver(
+      ([entry]) => {
+        setIsPricingVisible(entry.isIntersecting)
+      },
+      { threshold: 0.1 }
+    )
+
+    observer.observe(pricingSection)
+
+    return () => {
+      if (pricingSection) {
+        observer.unobserve(pricingSection)
+      }
+    }
+  }, [])
+
+  const showNotification = isPricingVisible && !isNotificationDismissed
+
   useEffect(() => {
     const updateNotificationHeight = () => {
       if (showNotification && notificationRef.current) {
         setNotificationHeight(notificationRef.current.offsetHeight);
       } else {
         setNotificationHeight(0);
       }
     };

     // Initial calculation
     updateNotificationHeight();

     // Update on resize
     window.addEventListener('resize', updateNotificationHeight);

     // For good measure, a ResizeObserver in case content changes cause height change
     const observer = new ResizeObserver(updateNotificationHeight);
     if (notificationRef.current) observer.observe(notificationRef.current);

     return () => {
       window.removeEventListener('resize', updateNotificationHeight);
       if (notificationRef.current) observer.unobserve(notificationRef.current);
     };
-  }, [showNotification]);
+  }, [showNotification]);

   return (
     <>
@@ -67,7 +90,7 @@
             <Sparkles className="size-4 animate-pulse" />
             🔥 Flash Sale: 50% OFF untuk 5 klien pertama hari ini!
             <button
-              onClick={() => setShowNotification(false)}
+              onClick={() => setIsNotificationDismissed(true)}
               className="ml-4 text-white/80 hover:text-white"
             >
               <X className="size-4" />
```

---


====================== example patches end
